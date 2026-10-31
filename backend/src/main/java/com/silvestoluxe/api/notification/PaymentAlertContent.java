package com.silvestoluxe.api.notification;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;

import org.springframework.web.util.HtmlUtils;

/** The email the shop receives about a failed payment, or money that needs refunding. */
final class PaymentAlertContent {
    private PaymentAlertContent() { }

    static String subject(PaymentAlert alert, String shopName) {
        return shopName + ": " + (alert.kind() == PaymentAlert.Kind.NEEDS_REFUND
                ? "A payment for order " + alert.orderNumber() + " needs a refund"
                : "A payment for order " + alert.orderNumber() + " failed");
    }

    static String text(PaymentAlert alert) {
        return headline(alert) + "\n\n" + (hasText(alert.reason()) ? alert.reason() + "\n\n" : "") + nextStep(alert) + "\n";
    }

    static String html(PaymentAlert alert) {
        return """
                <!doctype html>
                <html><body style="margin:0;background:#f6f4f1;font-family:Helvetica,Arial,sans-serif;color:#1f1a17">
                <div style="max-width:560px;margin:0 auto;padding:32px 24px">
                <div style="background:#ffffff;border-radius:12px;padding:28px 24px">
                <p style="margin:0 0 12px;font-weight:bold">%s</p>
                <p style="margin:0;line-height:1.6;color:#6b625b">%s</p>
                <p style="margin:16px 0 0;line-height:1.6">%s</p>
                </div></div></body></html>
                """.formatted(escape(headline(alert)), hasText(alert.reason()) ? escape(alert.reason()) : "", escape(nextStep(alert)));
    }

    private static String headline(PaymentAlert alert) {
        return alert.kind() == PaymentAlert.Kind.NEEDS_REFUND
                ? money(alert.amount()) + " was paid for order " + alert.orderNumber() + ", and it needs refunding."
                : "A payment of " + money(alert.amount()) + " for order " + alert.orderNumber() + " failed.";
    }

    private static String nextStep(PaymentAlert alert) {
        return alert.kind() == PaymentAlert.Kind.NEEDS_REFUND
                ? "Refund it from your Razorpay dashboard. The order page in your admin updates by itself."
                : "No money was taken. The customer can try again from their order page.";
    }

    private static String money(BigDecimal amount) {
        return NumberFormat.getCurrencyInstance(Locale.forLanguageTag("en-IN")).format(amount);
    }

    private static boolean hasText(String value) { return value != null && !value.isBlank(); }

    private static String escape(String value) { return HtmlUtils.htmlEscape(value, "UTF-8"); }
}
