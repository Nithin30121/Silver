package com.silvestoluxe.api.payment;

import static com.silvestoluxe.api.payment.PaymentDtos.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.silvestoluxe.api.order.OrderDtos.PaymentTarget;
import com.silvestoluxe.api.order.OrderDtos.Response;
import com.silvestoluxe.api.order.OrderService;
import com.silvestoluxe.api.payment.RazorpayClient.Payment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Online payments through Razorpay. Prices never come from the browser: the amount is read from the
 * saved order, and an order counts as paid only once Razorpay itself says the money was captured.
 * Razorpay calls happen outside any database transaction, so a slow reply never holds a lock.
 */
@Service
public class PaymentService {
    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);
    static final int MAX_ATTEMPTS = 10;
    private static final int MAX_REFUNDS_LISTED = 50;

    private final RazorpayClient razorpay;
    private final OrderService orders;
    private final OrderPaymentRepository payments;
    private final PaymentSettlement settlement;
    private final JdbcTemplate jdbcTemplate;
    private final String shopName;

    public PaymentService(RazorpayClient razorpay, OrderService orders, OrderPaymentRepository payments, PaymentSettlement settlement,
                          JdbcTemplate jdbcTemplate, @Value("${app.mail.shop-name:SILVORA}") String shopName) {
        this.razorpay = razorpay;
        this.orders = orders;
        this.payments = payments;
        this.settlement = settlement;
        this.jdbcTemplate = jdbcTemplate;
        this.shopName = shopName;
    }

    public PaymentOptions options() { return new PaymentOptions(razorpay.isEnabled()); }

    /** Readies a payment for the customer's own unpaid order. */
    public StartedPayment start(String subject, UUID orderId) {
        requireEnabled();
        PaymentTarget order = orders.paymentTarget(subject, orderId);
        List<OrderPayment> attempts = payments.findByOrderIdOrderByCreatedAtDesc(orderId);
        try {
            String razorpayOrderId = reusableAttempt(attempts);
            if (razorpayOrderId == null) razorpayOrderId = newAttempt(order, attempts.size());
            orders.extendPaymentTime(orderId);
            return new StartedPayment(razorpay.keyId(), razorpayOrderId, PaymentSettlement.inPaise(order.totalAmount()), "INR",
                    shopName, order.orderNumber(), order.customerName(), order.customerEmail(), order.customerPhone());
        } catch (RazorpayException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "We could not start the payment. Please try again.");
        }
    }

    /**
     * A customer who went back without paying uses the same Razorpay order, which also stops two tabs
     * paying twice. Razorpay refuses an order once a payment has failed against it, so that needs a new
     * one. This is also where a payment the browser never heard about is caught before charging again.
     */
    private String reusableAttempt(List<OrderPayment> attempts) {
        if (attempts.isEmpty() || attempts.get(0).getStatus() != OrderPaymentStatus.CREATED) return null;
        String latest = attempts.get(0).getRazorpayOrderId();
        List<Payment> tried = razorpay.paymentsOf(latest);
        if (settleCompleted(tried)) throw new ResponseStatusException(HttpStatus.CONFLICT, "This order has already been paid.");
        return tried.isEmpty() ? latest : null;
    }

    private String newAttempt(PaymentTarget order, int attemptsSoFar) {
        if (attemptsSoFar >= MAX_ATTEMPTS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This order has had too many payment attempts. Please contact us for help.");
        }
        // Razorpay refuses a repeated receipt, so each attempt needs its own.
        String razorpayOrderId = razorpay.createOrder(PaymentSettlement.inPaise(order.totalAmount()),
                order.orderNumber() + "-" + (attemptsSoFar + 1), Map.of("order_number", order.orderNumber()));
        settlement.recordAttempt(order.id(), razorpayOrderId, order.totalAmount());
        return razorpayOrderId;
    }

    /**
     * Confirms a payment the customer has just finished. If Razorpay can't be asked right now the proof
     * is still genuine, so the customer sees the order as it stands and the webhook finishes the job.
     */
    public Response verify(String subject, UUID orderId, PaymentProof proof) {
        requireEnabled();
        orders.customerOrder(subject, orderId);
        OrderPayment attempt = payments.findByRazorpayOrderId(proof.razorpayOrderId())
                .filter(candidate -> candidate.getOrderId().equals(orderId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found."));
        if (!razorpay.isGenuinePayment(attempt.getRazorpayOrderId(), proof.razorpayPaymentId(), proof.razorpaySignature())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "We could not confirm this payment. Please contact us if money left your account.");
        }
        try {
            Payment payment = razorpay.fetchPayment(proof.razorpayPaymentId());
            if (attempt.getRazorpayOrderId().equals(payment.razorpayOrderId())) settleCompleted(List.of(payment));
        } catch (RazorpayException exception) {
            log.warn("Could not check a finished payment with Razorpay; the webhook will settle it.");
        }
        return orders.customerOrder(subject, orderId);
    }

    /** Saves any payment that has gone through, capturing it first if the account captures by hand. */
    private boolean settleCompleted(List<Payment> tried) {
        boolean completed = false;
        for (Payment payment : tried) {
            Payment latest = payment.isAuthorized() ? razorpay.capture(payment) : payment;
            if (!latest.isCaptured()) continue;
            settlement.captured(latest);
            completed = true;
        }
        return completed;
    }

    /**
     * Cancels online orders nobody paid for, so their pieces go back on sale. Each one is checked with
     * Razorpay first, so a missed webhook can't cancel an order that was paid; if Razorpay can't be
     * reached the order waits for the next check.
     */
    public void expireOverdue() {
        if (!razorpay.isEnabled()) return;
        for (UUID orderId : orders.overduePayments()) {
            try {
                boolean paid = false;
                for (OrderPayment attempt : payments.findByOrderIdOrderByCreatedAtDesc(orderId)) {
                    if (!attempt.isClosed()) paid |= settleCompleted(razorpay.paymentsOf(attempt.getRazorpayOrderId()));
                }
                if (!paid) orders.expireUnpaid(orderId);
            } catch (RazorpayException exception) {
                log.warn("Could not check an overdue order with Razorpay; it will be checked again.");
            }
        }
    }

    public List<PaymentRow> forOrder(UUID orderId) {
        return payments.findByOrderIdOrderByCreatedAtDesc(orderId).stream()
                .map(payment -> new PaymentRow(payment.getId(), payment.getAmount(), payment.getStatus(), payment.getMethod(),
                        payment.getRazorpayOrderId(), payment.getRazorpayPaymentId(), payment.getFailureReason(), payment.getCreatedAt()))
                .toList();
    }

    /** Money the shop is holding for orders that couldn't take it, newest first. */
    public List<RefundToMake> refundsToMake() {
        return jdbcTemplate.query("""
                select p.order_id, o.order_number, p.amount, p.razorpay_payment_id, p.failure_reason
                from public.order_payments p join public.orders o on o.id = p.order_id
                where p.status = 'NEEDS_REFUND'
                order by p.created_at desc limit ?
                """, (row, index) -> new RefundToMake(row.getObject(1, UUID.class), row.getString(2), row.getBigDecimal(3),
                row.getString(4), row.getString(5)), MAX_REFUNDS_LISTED);
    }

    private void requireEnabled() {
        if (!razorpay.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Online payment isn't available right now.");
        }
    }
}
