package com.silvestoluxe.api.payment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import com.silvestoluxe.api.notification.PaymentAlert;
import com.silvestoluxe.api.order.OrderService;
import com.silvestoluxe.api.order.PaymentMethod;
import com.silvestoluxe.api.payment.RazorpayClient.Payment;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;

class PaymentSettlementTest {
    private final OrderPaymentRepository payments = mock(OrderPaymentRepository.class);
    private final OrderService orders = mock(OrderService.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final PaymentSettlement settlement = new PaymentSettlement(payments, orders, events);

    private final UUID orderId = UUID.randomUUID();
    private final OrderPayment attempt = new OrderPayment(orderId, "order_1", new BigDecimal("1250.50"));

    @Test
    void aCapturedPaymentPaysTheOrder() {
        attemptExists();
        when(orders.applyPayment(orderId, PaymentMethod.UPI)).thenReturn(true);

        settlement.captured(captured("upi", 125050));

        assertEquals(OrderPaymentStatus.PAID, attempt.getStatus());
        assertEquals("pay_1", attempt.getRazorpayPaymentId());
        verifyNoInteractions(events);
    }

    @Test
    void remembersOtherMethodsAsOnline() {
        attemptExists();
        when(orders.applyPayment(orderId, PaymentMethod.ONLINE)).thenReturn(true);

        settlement.captured(captured("netbanking", 125050));

        verify(orders).applyPayment(orderId, PaymentMethod.ONLINE);
        assertEquals("netbanking", attempt.getMethod());
    }

    @Test
    void hearingAboutTheSamePaymentTwiceChangesNothing() {
        attemptExists();
        attempt.settle(OrderPaymentStatus.PAID, "pay_1", "upi", null);

        settlement.captured(captured("upi", 125050));

        verify(orders, never()).applyPayment(any(), any());
        verifyNoInteractions(events);
    }

    @Test
    void anAmountThatDoesNotMatchIsNeverAccepted() {
        attemptExists();
        when(orders.orderNumber(orderId)).thenReturn("SL-1");

        settlement.captured(captured("upi", 100));

        verify(orders, never()).applyPayment(any(), any());
        assertEquals(OrderPaymentStatus.NEEDS_REFUND, attempt.getStatus());
        assertEquals(PaymentSettlement.WRONG_AMOUNT, attempt.getFailureReason());
        assertEquals(new BigDecimal("1.00"), alert().amount());
    }

    @Test
    void anotherCurrencyIsNeverAccepted() {
        attemptExists();
        when(orders.orderNumber(orderId)).thenReturn("SL-1");

        settlement.captured(new Payment("pay_1", "order_1", 125050, "USD", "captured", "card", null));

        verify(orders, never()).applyPayment(any(), any());
        assertEquals(OrderPaymentStatus.NEEDS_REFUND, attempt.getStatus());
    }

    @Test
    void moneyForACancelledOrderIsFlaggedForARefund() {
        attemptExists();
        when(orders.applyPayment(orderId, PaymentMethod.UPI)).thenReturn(false);
        when(orders.orderNumber(orderId)).thenReturn("SL-1");

        settlement.captured(captured("upi", 125050));

        assertEquals(OrderPaymentStatus.NEEDS_REFUND, attempt.getStatus());
        verify(orders).addNote(eq(orderId), anyString());
        PaymentAlert alert = alert();
        assertEquals(PaymentAlert.Kind.NEEDS_REFUND, alert.kind());
        assertEquals("SL-1", alert.orderNumber());
    }

    @Test
    void ignoresAnUncapturedPaymentAndOneFromElsewhere() {
        settlement.captured(new Payment("pay_1", "order_1", 125050, "INR", "authorized", "upi", null));
        verifyNoInteractions(payments, orders);

        when(payments.lockByRazorpayOrderId("order_1")).thenReturn(Optional.empty());
        settlement.captured(captured("upi", 125050));
        settlement.failed(failed());
        verifyNoInteractions(orders, events);
    }

    @Test
    void aFailureIsRecordedAndOnlyTheFirstEmailsTheShop() {
        attemptExists();
        when(orders.orderNumber(orderId)).thenReturn("SL-1");

        settlement.failed(failed());

        assertEquals(OrderPaymentStatus.FAILED, attempt.getStatus());
        assertEquals("Payment declined by the bank", attempt.getFailureReason());
        verify(orders).markPaymentFailed(orderId);
        assertEquals(PaymentAlert.Kind.FAILED, alert().kind());

        when(payments.existsByOrderIdAndStatus(orderId, OrderPaymentStatus.FAILED)).thenReturn(true);
        settlement.failed(failed());
        verify(events).publishEvent(any(PaymentAlert.class));
    }

    @Test
    void aLateFailureCannotUndoAPayment() {
        attemptExists();
        attempt.settle(OrderPaymentStatus.PAID, "pay_1", "upi", null);

        settlement.failed(failed());

        assertEquals(OrderPaymentStatus.PAID, attempt.getStatus());
        verify(orders, never()).markPaymentFailed(any());
    }

    @Test
    void aSuccessAfterAFailureStillPaysTheOrder() {
        attemptExists();
        when(orders.applyPayment(orderId, PaymentMethod.CARD)).thenReturn(true);
        settlement.failed(failed());

        settlement.captured(captured("card", 125050));

        assertEquals(OrderPaymentStatus.PAID, attempt.getStatus());
        assertEquals(null, attempt.getFailureReason());
    }

    @Test
    void aFullRefundUpdatesTheOrder() {
        paidAttempt();

        settlement.refunded(payment("pay_1"), 125050, true);

        assertEquals(OrderPaymentStatus.REFUNDED, attempt.getStatus());
        verify(orders).markRefunded(orderId);
    }

    @Test
    void aPartialRefundLeavesTheOrderPaid() {
        paidAttempt();

        settlement.refunded(payment("pay_1"), 10000, false);

        assertEquals(OrderPaymentStatus.PAID, attempt.getStatus());
        verify(orders, never()).markRefunded(any());
        verify(orders).addNote(orderId, "Razorpay refunded ₹100.00.");
    }

    @Test
    void refundingFlaggedMoneyClearsTheFlagButLeavesTheOrderAlone() {
        attempt.settle(OrderPaymentStatus.NEEDS_REFUND, "pay_1", "upi", PaymentSettlement.ALREADY_CLOSED);
        when(payments.lockByRazorpayPaymentId("pay_1")).thenReturn(Optional.of(attempt));

        settlement.refunded(payment("pay_1"), 125050, true);

        assertEquals(OrderPaymentStatus.REFUNDED, attempt.getStatus());
        verify(orders, never()).markRefunded(any());
    }

    private void attemptExists() { when(payments.lockByRazorpayOrderId("order_1")).thenReturn(Optional.of(attempt)); }

    private void paidAttempt() {
        attempt.settle(OrderPaymentStatus.PAID, "pay_1", "upi", null);
        when(payments.lockByRazorpayPaymentId("pay_1")).thenReturn(Optional.of(attempt));
    }

    private PaymentAlert alert() {
        ArgumentCaptor<PaymentAlert> alert = ArgumentCaptor.forClass(PaymentAlert.class);
        verify(events).publishEvent(alert.capture());
        return alert.getValue();
    }

    private static Payment captured(String method, long paise) { return new Payment("pay_1", "order_1", paise, "INR", "captured", method, null); }
    private static Payment payment(String id) { return new Payment(id, "order_1", 125050, "INR", "refunded", "upi", null); }
    private static Payment failed() { return new Payment("pay_0", "order_1", 125050, "INR", "failed", "card", "Payment declined by the bank"); }
}
