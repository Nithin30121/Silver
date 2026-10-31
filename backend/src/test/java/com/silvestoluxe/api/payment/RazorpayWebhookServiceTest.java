package com.silvestoluxe.api.payment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;

import com.silvestoluxe.api.payment.RazorpayClient.Payment;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

class RazorpayWebhookServiceTest {
    private final PaymentSettlement settlement = mock(PaymentSettlement.class);
    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final RazorpayWebhookService webhooks = new RazorpayWebhookService(settlement, jdbcTemplate);

    @Test
    void passesOnACapturedPayment() {
        newEvent();

        webhooks.handle("evt_1", event("payment.captured", "\"amount\":125050,\"currency\":\"INR\",\"status\":\"captured\",\"order_id\":\"order_1\",\"method\":\"upi\"", ""));

        ArgumentCaptor<Payment> payment = ArgumentCaptor.forClass(Payment.class);
        verify(settlement).captured(payment.capture());
        assertEquals(new Payment("pay_1", "order_1", 125050, "INR", "captured", "upi", null), payment.getValue());
    }

    @Test
    void treatsOrderPaidTheSameWay() {
        newEvent();

        webhooks.handle("evt_1", event("order.paid", "\"status\":\"captured\",\"order_id\":\"order_1\"", ""));

        verify(settlement).captured(any());
    }

    @Test
    void passesOnAFailureWithItsReason() {
        newEvent();

        webhooks.handle("evt_1", event("payment.failed", "\"status\":\"failed\",\"order_id\":\"order_1\",\"error_description\":\"Declined\"", ""));

        ArgumentCaptor<Payment> payment = ArgumentCaptor.forClass(Payment.class);
        verify(settlement).failed(payment.capture());
        assertEquals("Declined", payment.getValue().failureReason());
    }

    @Test
    void spotsAFullRefund() {
        newEvent();

        webhooks.handle("evt_1", event("refund.processed", "\"amount\":125050,\"amount_refunded\":125050,\"refund_status\":\"full\"",
                ",\"refund\":{\"entity\":{\"id\":\"rfnd_1\",\"amount\":125050,\"payment_id\":\"pay_1\"}}"));

        verify(settlement).refunded(any(), eq(125050L), eq(true));
    }

    @Test
    void spotsAPartialRefund() {
        newEvent();

        webhooks.handle("evt_1", event("refund.processed", "\"amount\":125050,\"amount_refunded\":10000,\"refund_status\":\"partial\"",
                ",\"refund\":{\"entity\":{\"id\":\"rfnd_1\",\"amount\":10000,\"payment_id\":\"pay_1\"}}"));

        verify(settlement).refunded(any(), eq(10000L), eq(false));
    }

    @Test
    void skipsAnEventItHasAlreadyHandled() {
        when(jdbcTemplate.update(anyString(), eq("evt_1"))).thenReturn(0);

        webhooks.handle("evt_1", event("payment.captured", "\"status\":\"captured\",\"order_id\":\"order_1\"", ""));

        verifyNoInteractions(settlement);
    }

    @Test
    void ignoresEventsThisShopDoesNotUse() {
        newEvent();

        webhooks.handle("evt_1", event("payment.authorized", "\"status\":\"authorized\",\"order_id\":\"order_1\"", ""));
        webhooks.handle("evt_2", "{\"event\":\"payment.downtime.started\",\"payload\":{}}".getBytes(StandardCharsets.UTF_8));

        verify(settlement, never()).captured(any());
        verify(settlement, never()).refunded(any(), anyLong(), anyBoolean());
    }

    private void newEvent() { when(jdbcTemplate.update(anyString(), anyString())).thenReturn(1); }

    private static byte[] event(String name, String paymentFields, String more) {
        return ("{\"entity\":\"event\",\"event\":\"" + name + "\",\"payload\":{\"payment\":{\"entity\":{\"id\":\"pay_1\"," + paymentFields + "}}" + more + "}}")
                .getBytes(StandardCharsets.UTF_8);
    }
}
