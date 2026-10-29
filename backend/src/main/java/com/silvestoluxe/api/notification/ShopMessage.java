package com.silvestoluxe.api.notification;

/**
 * A contact form message to forward to the shop's own inbox. Like order emails it is published inside
 * the saving transaction and sent only after it commits.
 */
public record ShopMessage(String name, String email, String phone, String subject, String orderNumber, String message) { }
