package com.silvestoluxe.api.delivery;

/** A Delhivery call that failed or was refused. The message is written for the shop owner and may quote Delhivery. */
public class DelhiveryException extends RuntimeException {
    public DelhiveryException(String message) { super(message); }
    public DelhiveryException(String message, Throwable cause) { super(message, cause); }
}
