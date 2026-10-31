package com.silvestoluxe.api.order;

/** ONLINE is an order paid in Razorpay's window; once paid it becomes UPI or CARD when it was one of those. */
public enum PaymentMethod {
    UPI, CARD, COD, ONLINE
}
