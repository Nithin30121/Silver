package com.silvestoluxe.api.notification;

import org.springframework.web.util.HtmlUtils;

/** The email the shop receives when a piece runs low or sells out. Product names are escaped in HTML. */
final class StockAlertContent {
    private StockAlertContent() { }

    static String subject(LowStockAlert alert, String shopName) {
        return shopName + ": " + alert.productName() + (alert.soldOut()
                ? " has sold out"
                : " is running low (" + pieces(alert.quantityLeft()) + " left)");
    }

    static String text(LowStockAlert alert, String shopUrl) {
        return headline(alert) + "\n\n" + cause(alert) + "\n\n"
                + "Restock it from Inventory in your admin dashboard" + (isWebAddress(shopUrl) ? ": " + adminUrl(shopUrl) : ".") + "\n";
    }

    static String html(LowStockAlert alert, String shopUrl) {
        String link = isWebAddress(shopUrl)
                ? "<p style=\"margin:24px 0 0\"><a href=\"" + escape(adminUrl(shopUrl)) + "\" style=\"color:#9b5b37\">Open the admin dashboard</a></p>"
                : "";
        return """
                <!doctype html>
                <html><body style="margin:0;background:#f6f4f1;font-family:Helvetica,Arial,sans-serif;color:#1f1a17">
                <div style="max-width:560px;margin:0 auto;padding:32px 24px">
                <div style="background:#ffffff;border-radius:12px;padding:28px 24px">
                <p style="margin:0 0 12px;font-weight:bold">%s</p>
                <p style="margin:0;line-height:1.6;color:#6b625b">%s</p>
                <p style="margin:16px 0 0;line-height:1.6">Restock it from Inventory in your admin dashboard.</p>%s
                </div></div></body></html>
                """.formatted(escape(headline(alert)), escape(cause(alert)), link);
    }

    private static String headline(LowStockAlert alert) {
        String name = alert.productName() + (hasText(alert.sku()) ? " (" + alert.sku() + ")" : "");
        return alert.soldOut() ? name + " has sold out." : name + " has only " + pieces(alert.quantityLeft()) + " left.";
    }

    private static String cause(LowStockAlert alert) {
        return hasText(alert.orderNumber()) ? "This followed order " + alert.orderNumber() + "."
                : "This followed a stock change in the dashboard.";
    }

    private static String pieces(int count) { return count == 1 ? "1 piece" : count + " pieces"; }

    private static String adminUrl(String shopUrl) { return shopUrl.replaceFirst("/+$", "") + "/admin"; }

    private static boolean isWebAddress(String url) {
        return url != null && (url.startsWith("https://") || url.startsWith("http://"));
    }

    private static boolean hasText(String value) { return value != null && !value.isBlank(); }

    private static String escape(String value) { return HtmlUtils.htmlEscape(value, "UTF-8"); }
}
