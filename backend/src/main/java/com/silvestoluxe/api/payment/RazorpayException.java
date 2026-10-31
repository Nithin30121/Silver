package com.silvestoluxe.api.payment;

/** Razorpay could not be reached or refused a request. Never carries a key, a secret or a customer's details. */
public class RazorpayException extends RuntimeException {
    public RazorpayException(String message) { super(message); }
    public RazorpayException(String message, Throwable cause) { super(message, cause); }
}
