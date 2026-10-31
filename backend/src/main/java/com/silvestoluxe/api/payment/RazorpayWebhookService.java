package com.silvestoluxe.api.payment;

import com.silvestoluxe.api.payment.RazorpayClient.Payment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Handles events Razorpay has already been proven to have sent; the controller checks the signature. */
@Service
public class RazorpayWebhookService {
    private static final JsonMapper JSON = JsonMapper.builder().build();

    private final PaymentSettlement settlement;
    private final JdbcTemplate jdbcTemplate;

    public RazorpayWebhookService(PaymentSettlement settlement, JdbcTemplate jdbcTemplate) {
        this.settlement = settlement;
        this.jdbcTemplate = jdbcTemplate;
    }

    /** The event id is saved in the same transaction, so an event that failed halfway can be redelivered. */
    @Transactional
    public void handle(String eventId, byte[] body) {
        if (eventId != null && jdbcTemplate.update(
                "insert into public.payment_webhook_events (event_id) values (?) on conflict do nothing", eventId) == 0) return;
        JsonNode event = JSON.readTree(body);
        JsonNode entity = event.at("/payload/payment/entity");
        Payment payment = Payment.from(entity);
        if (payment.id() == null) return;
        switch (event.path("event").asString("")) {
            case "payment.captured", "order.paid" -> settlement.captured(payment);
            case "payment.failed" -> settlement.failed(payment);
            case "refund.processed" -> settlement.refunded(payment, event.at("/payload/refund/entity/amount").asLong(0),
                    "full".equals(entity.path("refund_status").asString("")) || entity.path("amount_refunded").asLong(0) >= payment.amountInPaise());
            default -> { }
        }
    }
}
