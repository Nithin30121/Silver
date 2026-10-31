package com.silvestoluxe.api.payment;

import java.math.BigDecimal;
import java.util.UUID;

import com.silvestoluxe.api.notification.PaymentAlert;
import com.silvestoluxe.api.order.OrderService;
import com.silvestoluxe.api.order.PaymentMethod;
import com.silvestoluxe.api.payment.RazorpayClient.Payment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Saves what Razorpay reports. The browser, the webhook and the overdue check can all report the same
 * payment, in any order and more than once, so each step here is safe to repeat.
 */
@Service
public class PaymentSettlement {
    private static final Logger log = LoggerFactory.getLogger(PaymentSettlement.class);
    static final String ALREADY_CLOSED = "The order had already been cancelled or paid when this payment arrived.";
    static final String WRONG_AMOUNT = "The amount paid doesn't match the order.";

    private final OrderPaymentRepository payments;
    private final OrderService orders;
    private final ApplicationEventPublisher events;

    public PaymentSettlement(OrderPaymentRepository payments, OrderService orders, ApplicationEventPublisher events) {
        this.payments = payments;
        this.orders = orders;
        this.events = events;
    }

    @Transactional
    public void recordAttempt(UUID orderId, String razorpayOrderId, BigDecimal amount) {
        payments.save(new OrderPayment(orderId, razorpayOrderId, amount));
    }

    /** Money has arrived. It pays for the order, or is set aside for a refund if the order can't take it. */
    @Transactional
    public void captured(Payment payment) {
        if (!payment.isCaptured()) return;
        OrderPayment attempt = payments.lockByRazorpayOrderId(payment.razorpayOrderId()).orElse(null);
        if (attempt == null) {
            log.info("Ignoring a Razorpay payment for an order this shop didn't create.");
            return;
        }
        if (attempt.isClosed()) return;
        boolean rightAmount = "INR".equals(payment.currency()) && inPaise(attempt.getAmount()) == payment.amountInPaise();
        if (rightAmount && orders.applyPayment(attempt.getOrderId(), orderMethod(payment.method()))) {
            attempt.settle(OrderPaymentStatus.PAID, payment.id(), payment.method(), null);
            return;
        }
        String reason = rightAmount ? ALREADY_CLOSED : WRONG_AMOUNT;
        attempt.settle(OrderPaymentStatus.NEEDS_REFUND, payment.id(), payment.method(), reason);
        orders.addNote(attempt.getOrderId(), "A payment needs refunding. " + reason);
        events.publishEvent(new PaymentAlert(PaymentAlert.Kind.NEEDS_REFUND, orders.orderNumber(attempt.getOrderId()),
                BigDecimal.valueOf(payment.amountInPaise(), 2), reason));
    }

    /** Razorpay can report a failure and then a success for the same attempt, so a failure never closes it. */
    @Transactional
    public void failed(Payment payment) {
        OrderPayment attempt = payments.lockByRazorpayOrderId(payment.razorpayOrderId()).orElse(null);
        if (attempt == null || attempt.isClosed()) return;
        // Customers often try again, so only an order's first failure is worth an email.
        boolean firstFailure = !payments.existsByOrderIdAndStatus(attempt.getOrderId(), OrderPaymentStatus.FAILED);
        attempt.settle(OrderPaymentStatus.FAILED, payment.id(), payment.method(), payment.failureReason());
        orders.markPaymentFailed(attempt.getOrderId());
        if (firstFailure) {
            events.publishEvent(new PaymentAlert(PaymentAlert.Kind.FAILED, orders.orderNumber(attempt.getOrderId()),
                    attempt.getAmount(), payment.failureReason()));
        }
    }

    /** Refunds are made in Razorpay's dashboard; this keeps the order in step with them. */
    @Transactional
    public void refunded(Payment payment, long refundInPaise, boolean full) {
        OrderPayment attempt = payments.lockByRazorpayPaymentId(payment.id()).orElse(null);
        if (attempt == null) return;
        orders.addNote(attempt.getOrderId(), "Razorpay refunded ₹" + BigDecimal.valueOf(refundInPaise, 2).toPlainString() + ".");
        if (!full || attempt.getStatus() == OrderPaymentStatus.REFUNDED) return;
        boolean paidForTheOrder = attempt.getStatus() == OrderPaymentStatus.PAID;
        attempt.markRefunded();
        if (paidForTheOrder) orders.markRefunded(attempt.getOrderId());
    }

    static long inPaise(BigDecimal rupees) { return rupees.movePointRight(2).longValueExact(); }

    private static PaymentMethod orderMethod(String razorpayMethod) {
        return switch (razorpayMethod == null ? "" : razorpayMethod) {
            case "upi" -> PaymentMethod.UPI;
            case "card" -> PaymentMethod.CARD;
            default -> PaymentMethod.ONLINE;
        };
    }
}
