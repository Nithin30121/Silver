package com.silvestoluxe.api.notification;

import java.math.BigDecimal;

/**
 * Something about an online payment the shop should know. Published inside the payment's transaction
 * and emailed to the shop only after it commits.
 *
 * @param reason why a refund is needed, or Razorpay's explanation of the failure; may be null
 */
public record PaymentAlert(Kind kind, String orderNumber, BigDecimal amount, String reason) {
    public enum Kind { FAILED, NEEDS_REFUND }
}
