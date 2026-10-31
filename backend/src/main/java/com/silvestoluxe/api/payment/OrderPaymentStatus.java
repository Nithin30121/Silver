package com.silvestoluxe.api.payment;

/** NEEDS_REFUND is money that arrived for an order that could not take it, such as one already cancelled. */
public enum OrderPaymentStatus {
    CREATED, PAID, FAILED, NEEDS_REFUND, REFUNDED
}
