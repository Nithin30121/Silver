package com.silvestoluxe.api.payment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.silvestoluxe.api.order.OrderDtos.PaymentTarget;
import com.silvestoluxe.api.order.OrderService;
import com.silvestoluxe.api.payment.PaymentDtos.PaymentProof;
import com.silvestoluxe.api.payment.PaymentDtos.StartedPayment;
import com.silvestoluxe.api.payment.RazorpayClient.Payment;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

class PaymentServiceTest {
    private static final String SUBJECT = "customer";
    private static final PaymentProof PROOF = new PaymentProof("order_1", "pay_1", "a".repeat(64));

    private final RazorpayClient razorpay = mock(RazorpayClient.class);
    private final OrderService orders = mock(OrderService.class);
    private final OrderPaymentRepository payments = mock(OrderPaymentRepository.class);
    private final PaymentSettlement settlement = mock(PaymentSettlement.class);
    private final PaymentService service = new PaymentService(razorpay, orders, payments, settlement, mock(JdbcTemplate.class), "SILVORA");

    private final UUID orderId = UUID.randomUUID();
    private final OrderPayment attempt = new OrderPayment(orderId, "order_1", new BigDecimal("1250.50"));

    @Test
    void refusesEverythingWhileTheKeysAreMissing() {
        ResponseStatusException start = assertThrows(ResponseStatusException.class, () -> service.start(SUBJECT, orderId));
        ResponseStatusException verify = assertThrows(ResponseStatusException.class, () -> service.verify(SUBJECT, orderId, PROOF));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, start.getStatusCode());
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, verify.getStatusCode());
        service.expireOverdue();
        verify(orders, never()).overduePayments();
    }

    @Test
    void startsAPaymentForTheSavedAmount() {
        enabled();
        payableOrder();
        when(payments.findByOrderIdOrderByCreatedAtDesc(orderId)).thenReturn(List.of());
        when(razorpay.createOrder(eq(125050L), eq("SL-1-1"), anyMap())).thenReturn("order_new");

        StartedPayment started = service.start(SUBJECT, orderId);

        assertEquals("order_new", started.razorpayOrderId());
        assertEquals(125050, started.amountInPaise());
        assertEquals("rzp_test_abc", started.keyId());
        verify(settlement).recordAttempt(orderId, "order_new", new BigDecimal("1250.50"));
        verify(orders).extendPaymentTime(orderId);
    }

    @Test
    void reusesAnAttemptNobodyTriedToPay() {
        enabled();
        payableOrder();
        when(payments.findByOrderIdOrderByCreatedAtDesc(orderId)).thenReturn(List.of(attempt));
        when(razorpay.paymentsOf("order_1")).thenReturn(List.of());

        assertEquals("order_1", service.start(SUBJECT, orderId).razorpayOrderId());

        verify(razorpay, never()).createOrder(anyLong(), anyString(), anyMap());
    }

    @Test
    void makesANewAttemptAfterAFailureWithItsOwnReceipt() {
        enabled();
        payableOrder();
        when(payments.findByOrderIdOrderByCreatedAtDesc(orderId)).thenReturn(List.of(attempt));
        when(razorpay.paymentsOf("order_1")).thenReturn(List.of(new Payment("pay_0", "order_1", 125050, "INR", "failed", "card", "Declined")));
        when(razorpay.createOrder(eq(125050L), eq("SL-1-2"), anyMap())).thenReturn("order_2");

        assertEquals("order_2", service.start(SUBJECT, orderId).razorpayOrderId());
    }

    @Test
    void neverChargesAgainWhenAMissedPaymentHadGoneThrough() {
        enabled();
        payableOrder();
        when(payments.findByOrderIdOrderByCreatedAtDesc(orderId)).thenReturn(List.of(attempt));
        Payment missed = captured();
        when(razorpay.paymentsOf("order_1")).thenReturn(List.of(missed));

        ResponseStatusException conflict = assertThrows(ResponseStatusException.class, () -> service.start(SUBJECT, orderId));

        assertEquals(HttpStatus.CONFLICT, conflict.getStatusCode());
        verify(settlement).captured(missed);
        verify(razorpay, never()).createOrder(anyLong(), anyString(), anyMap());
    }

    @Test
    void stopsAfterTooManyAttempts() {
        enabled();
        payableOrder();
        List<OrderPayment> many = new ArrayList<>();
        for (int count = 0; count < PaymentService.MAX_ATTEMPTS; count++) {
            OrderPayment failed = new OrderPayment(orderId, "order_" + count, new BigDecimal("1250.50"));
            failed.settle(OrderPaymentStatus.FAILED, null, null, null);
            many.add(failed);
        }
        when(payments.findByOrderIdOrderByCreatedAtDesc(orderId)).thenReturn(many);

        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class, () -> service.start(SUBJECT, orderId)).getStatusCode());
        verify(razorpay, never()).createOrder(anyLong(), anyString(), anyMap());
    }

    @Test
    void tellsTheCustomerWhenRazorpayCannotBeReached() {
        enabled();
        payableOrder();
        when(payments.findByOrderIdOrderByCreatedAtDesc(orderId)).thenReturn(List.of());
        when(razorpay.createOrder(anyLong(), anyString(), anyMap())).thenThrow(new RazorpayException("down"));

        assertEquals(HttpStatus.BAD_GATEWAY, assertThrows(ResponseStatusException.class, () -> service.start(SUBJECT, orderId)).getStatusCode());
    }

    @Test
    void aForgedProofChangesNothing() {
        enabled();
        when(payments.findByRazorpayOrderId("order_1")).thenReturn(Optional.of(attempt));
        when(razorpay.isGenuinePayment("order_1", "pay_1", PROOF.razorpaySignature())).thenReturn(false);

        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class, () -> service.verify(SUBJECT, orderId, PROOF)).getStatusCode());

        verify(razorpay, never()).fetchPayment(anyString());
        verify(settlement, never()).captured(any());
    }

    @Test
    void aPaymentFromAnotherOrderCannotPayThisOne() {
        enabled();
        OrderPayment someoneElses = new OrderPayment(UUID.randomUUID(), "order_1", new BigDecimal("1.00"));
        when(payments.findByRazorpayOrderId("order_1")).thenReturn(Optional.of(someoneElses));

        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class, () -> service.verify(SUBJECT, orderId, PROOF)).getStatusCode());
        verify(razorpay, never()).isGenuinePayment(any(), any(), any());
    }

    @Test
    void aGenuinePaymentForAnotherRazorpayOrderIsIgnored() {
        verifiableProof();
        when(razorpay.fetchPayment("pay_1")).thenReturn(new Payment("pay_1", "order_other", 125050, "INR", "captured", "upi", null));

        service.verify(SUBJECT, orderId, PROOF);

        verify(settlement, never()).captured(any());
    }

    @Test
    void trustsRazorpaysOwnRecordRatherThanTheBrowser() {
        verifiableProof();
        Payment payment = captured();
        when(razorpay.fetchPayment("pay_1")).thenReturn(payment);

        service.verify(SUBJECT, orderId, PROOF);

        verify(settlement).captured(payment);
    }

    @Test
    void capturesAPaymentTheAccountDidNotCaptureByItself() {
        verifiableProof();
        Payment authorized = new Payment("pay_1", "order_1", 125050, "INR", "authorized", "upi", null);
        Payment captured = captured();
        when(razorpay.fetchPayment("pay_1")).thenReturn(authorized);
        when(razorpay.capture(authorized)).thenReturn(captured);

        service.verify(SUBJECT, orderId, PROOF);

        verify(settlement).captured(captured);
    }

    @Test
    void aSlowRazorpayLeavesTheWebhookToFinish() {
        verifiableProof();
        when(razorpay.fetchPayment("pay_1")).thenThrow(new RazorpayException("down"));

        service.verify(SUBJECT, orderId, PROOF);

        verify(settlement, never()).captured(any());
    }

    @Test
    void cancelsAnOverdueOrderNobodyPaidFor() {
        enabled();
        overdueOrder();
        when(razorpay.paymentsOf("order_1")).thenReturn(List.of());

        service.expireOverdue();

        verify(orders).expireUnpaid(orderId);
    }

    @Test
    void anOverdueOrderThatWasPaidIsSavedNotCancelled() {
        enabled();
        overdueOrder();
        when(razorpay.paymentsOf("order_1")).thenReturn(List.of(captured()));

        service.expireOverdue();

        verify(settlement).captured(any());
        verify(orders, never()).expireUnpaid(any());
    }

    @Test
    void anOverdueOrderWaitsWhileRazorpayCannotBeReached() {
        enabled();
        overdueOrder();
        when(razorpay.paymentsOf("order_1")).thenThrow(new RazorpayException("down"));

        service.expireOverdue();

        verify(orders, never()).expireUnpaid(any());
    }

    @Test
    void reportsWhetherOnlinePaymentsAreOn() {
        enabled();
        assertTrue(service.options().online());
    }

    private void enabled() {
        when(razorpay.isEnabled()).thenReturn(true);
        when(razorpay.keyId()).thenReturn("rzp_test_abc");
    }

    private void payableOrder() {
        when(orders.paymentTarget(SUBJECT, orderId)).thenReturn(new PaymentTarget(orderId, "SL-1", new BigDecimal("1250.50"),
                "Asha Rao", "asha@example.com", "+91 90000 00001"));
    }

    private void verifiableProof() {
        enabled();
        when(payments.findByRazorpayOrderId("order_1")).thenReturn(Optional.of(attempt));
        when(razorpay.isGenuinePayment("order_1", "pay_1", PROOF.razorpaySignature())).thenReturn(true);
    }

    private void overdueOrder() {
        when(orders.overduePayments()).thenReturn(List.of(orderId));
        when(payments.findByOrderIdOrderByCreatedAtDesc(orderId)).thenReturn(List.of(attempt));
    }

    private static Payment captured() { return new Payment("pay_1", "order_1", 125050, "INR", "captured", "upi", null); }
}
