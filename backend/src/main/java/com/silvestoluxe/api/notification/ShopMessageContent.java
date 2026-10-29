package com.silvestoluxe.api.notification;

import org.springframework.web.util.HtmlUtils;

/** The email the shop receives for each contact form message. Every value the sender typed is escaped in HTML. */
final class ShopMessageContent {
    private ShopMessageContent() { }

    static String subject(ShopMessage message, String shopName) {
        String about = hasText(message.subject()) ? ": " + message.subject() : "";
        return shopName + " message from " + message.name() + about;
    }

    static String text(ShopMessage message) {
        StringBuilder body = new StringBuilder("New message from your shop's contact form.\n\n")
                .append("From: ").append(message.name()).append(" <").append(message.email()).append(">\n");
        if (hasText(message.phone())) body.append("Phone: ").append(message.phone()).append('\n');
        if (hasText(message.orderNumber())) body.append("Order: ").append(message.orderNumber()).append('\n');
        if (hasText(message.subject())) body.append("Subject: ").append(message.subject()).append('\n');
        return body.append('\n').append(message.message()).append("\n\n")
                .append("Reply to this email to answer them. The message is also under Messages in your admin dashboard.\n")
                .toString();
    }

    static String html(ShopMessage message) {
        StringBuilder details = new StringBuilder()
                .append(row("From", escape(message.name()) + " &lt;" + escape(message.email()) + "&gt;"));
        if (hasText(message.phone())) details.append(row("Phone", escape(message.phone())));
        if (hasText(message.orderNumber())) details.append(row("Order", escape(message.orderNumber())));
        if (hasText(message.subject())) details.append(row("Subject", escape(message.subject())));
        return """
                <!doctype html>
                <html><body style="margin:0;background:#f6f4f1;font-family:Helvetica,Arial,sans-serif;color:#1f1a17">
                <div style="max-width:560px;margin:0 auto;padding:32px 24px">
                <div style="background:#ffffff;border-radius:12px;padding:28px 24px">
                <p style="margin:0 0 16px;font-weight:bold">New message from your shop's contact form</p>
                <table style="border-collapse:collapse;font-size:14px">%s</table>
                <p style="margin:20px 0 0;line-height:1.6;white-space:pre-wrap">%s</p>
                <p style="margin:24px 0 0;color:#6b625b;font-size:13px">Reply to this email to answer them. The message is also under Messages in your admin dashboard.</p>
                </div></div></body></html>
                """.formatted(details, escape(message.message()));
    }

    private static String row(String label, String value) {
        return "<tr><td style=\"padding:2px 12px 2px 0;color:#6b625b\">" + label + "</td><td style=\"padding:2px 0\">" + value + "</td></tr>";
    }

    private static boolean hasText(String value) { return value != null && !value.isBlank(); }

    private static String escape(String value) { return HtmlUtils.htmlEscape(value, "UTF-8"); }
}
