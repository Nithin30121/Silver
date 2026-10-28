package com.silvestoluxe.api.notification;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;

import org.springframework.web.util.HtmlUtils;

/** Subject, plain-text and HTML bodies for order emails. Every customer-supplied value is escaped in HTML. */
final class OrderEmailContent {
    private OrderEmailContent() { }

    static String subject(OrderEmail email, String shopName) {
        String order = email.orderNumber();
        return shopName + ": " + switch (email.kind()) {
            case PLACED -> "We've received your order " + order;
            case CONFIRMED -> "Your order " + order + " is confirmed";
            case SHIPPED -> "Your order " + order + " is on its way";
            case DELIVERED -> "Your order " + order + " has been delivered";
            case CANCELLED -> "Your order " + order + " has been cancelled";
        };
    }

    static String message(OrderEmail.Kind kind) {
        return switch (kind) {
            case PLACED -> "Thank you for shopping with us. We've received your order and will let you know as soon as it's confirmed.";
            case CONFIRMED -> "Good news: your order is confirmed and we're getting it ready.";
            case SHIPPED -> "Your order has been shipped and is on its way to you.";
            case DELIVERED -> "Your order has been delivered. We hope you love it.";
            case CANCELLED -> "Your order has been cancelled. If you weren't expecting this, just reply to this email.";
        };
    }

    static String text(OrderEmail email, String shopName, String shopUrl) {
        StringBuilder body = new StringBuilder()
                .append(greeting(email)).append("\n\n")
                .append(message(email.kind())).append("\n\n")
                .append("Order ").append(email.orderNumber()).append('\n');
        for (OrderEmail.Line line : email.lines()) {
            body.append("- ").append(line.name()).append(" x ").append(line.quantity())
                    .append(": ").append(money(line.lineTotal())).append('\n');
        }
        body.append("Total: ").append(money(email.total())).append("\n\n");
        String tracking = trackingLine(email);
        if (tracking != null) {
            body.append(tracking).append('\n');
            if (isSecureLink(email.tracking().url())) body.append("Track your parcel: ").append(email.tracking().url()).append('\n');
            body.append('\n');
        }
        if (hasText(email.shippingAddress())) body.append("Delivering to: ").append(email.shippingAddress()).append("\n\n");
        body.append(shopName);
        if (isWebAddress(shopUrl)) body.append('\n').append(shopUrl);
        return body.append('\n').toString();
    }

    static String html(OrderEmail email, String shopName, String shopUrl) {
        StringBuilder rows = new StringBuilder();
        for (OrderEmail.Line line : email.lines()) {
            rows.append("<tr><td style=\"padding:8px 0;border-bottom:1px solid #eee5dd\">").append(escape(line.name()))
                    .append(" &times; ").append(line.quantity())
                    .append("</td><td style=\"padding:8px 0;border-bottom:1px solid #eee5dd;text-align:right\">")
                    .append(escape(money(line.lineTotal()))).append("</td></tr>");
        }
        String tracking = trackingLine(email) == null ? ""
                : "<p style=\"margin:20px 0 0\">" + escape(trackingLine(email)) + (isSecureLink(email.tracking().url())
                        ? "<br><a href=\"" + escape(email.tracking().url()) + "\" style=\"color:#9b5b37\">Track your parcel</a>" : "") + "</p>";
        String address = tracking + (hasText(email.shippingAddress())
                ? "<p style=\"margin:20px 0 0;color:#6b625b\">Delivering to: " + escape(email.shippingAddress()) + "</p>" : "");
        String link = isWebAddress(shopUrl)
                ? "<p style=\"margin:28px 0 0\"><a href=\"" + escape(shopUrl) + "\" style=\"color:#9b5b37\">Visit " + escape(shopName) + "</a></p>" : "";
        return """
                <!doctype html>
                <html><body style="margin:0;background:#f6f4f1;font-family:Helvetica,Arial,sans-serif;color:#1f1a17">
                <div style="max-width:560px;margin:0 auto;padding:32px 24px">
                <p style="margin:0 0 24px;font-size:20px;letter-spacing:4px">%s</p>
                <div style="background:#ffffff;border-radius:12px;padding:28px 24px">
                <p style="margin:0 0 12px">%s</p>
                <p style="margin:0 0 24px;line-height:1.5">%s</p>
                <p style="margin:0 0 8px;font-weight:bold">Order %s</p>
                <table style="width:100%%;border-collapse:collapse;font-size:14px">%s
                <tr><td style="padding:12px 0 0;font-weight:bold">Total</td><td style="padding:12px 0 0;text-align:right;font-weight:bold">%s</td></tr>
                </table>%s%s
                </div></div></body></html>
                """.formatted(escape(shopName), escape(greeting(email)), escape(message(email.kind())), escape(email.orderNumber()),
                rows, escape(money(email.total())), address, link);
    }

    private static String greeting(OrderEmail email) {
        return hasText(email.customerName()) ? "Hi " + email.customerName().trim() + "," : "Hello,";
    }

    static String money(BigDecimal amount) {
        NumberFormat format = NumberFormat.getCurrencyInstance(Locale.of("en", "IN"));
        format.setMinimumFractionDigits(amount.stripTrailingZeros().scale() > 0 ? 2 : 0);
        return format.format(amount);
    }

    /** "Courier: Delhivery · Tracking number: 123", only in the shipped email and only when known. */
    private static String trackingLine(OrderEmail email) {
        if (!showsTracking(email)) return null;
        OrderEmail.Tracking tracking = email.tracking();
        String carrier = hasText(tracking.carrier()) ? "Courier: " + tracking.carrier().trim() : null;
        String number = hasText(tracking.number()) ? "Tracking number: " + tracking.number().trim() : null;
        if (carrier == null && number == null) return isSecureLink(tracking.url()) ? "Your parcel can be tracked online." : null;
        return carrier == null ? number : number == null ? carrier : carrier + " · " + number;
    }

    private static boolean showsTracking(OrderEmail email) {
        return email.kind() == OrderEmail.Kind.SHIPPED && email.tracking() != null;
    }

    private static boolean isSecureLink(String url) {
        return url != null && url.startsWith("https://");
    }

    private static boolean isWebAddress(String url) {
        return url != null && (url.startsWith("https://") || url.startsWith("http://"));
    }

    private static boolean hasText(String value) { return value != null && !value.isBlank(); }

    private static String escape(String value) { return HtmlUtils.htmlEscape(value, "UTF-8"); }
}
