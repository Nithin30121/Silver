package com.silvestoluxe.api.payment;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

/**
 * Razorpay's messages about payments and refunds. Anyone can reach this address, so nothing is read
 * from a message until its signature proves Razorpay sent it. The body stays as raw bytes because the
 * signature covers those exact bytes.
 */
@RestController
public class RazorpayWebhookController {
    private static final Logger log = LoggerFactory.getLogger(RazorpayWebhookController.class);

    private final RazorpayClient razorpay;
    private final RazorpayWebhookService webhooks;

    public RazorpayWebhookController(RazorpayClient razorpay, RazorpayWebhookService webhooks) {
        this.razorpay = razorpay;
        this.webhooks = webhooks;
    }

    @PostMapping("/api/webhooks/razorpay")
    public ResponseEntity<Void> receive(@RequestBody byte[] body,
                                        @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature,
                                        @RequestHeader(value = "x-razorpay-event-id", required = false) String eventId) {
        if (!razorpay.canCheckWebhooks()) return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        if (!razorpay.isGenuineWebhook(body, signature)) {
            log.warn("Refused a Razorpay webhook with a wrong signature.");
            return ResponseEntity.badRequest().build();
        }
        webhooks.handle(eventId, body);
        return ResponseEntity.ok().build();
    }
}
