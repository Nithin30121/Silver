package com.silvestoluxe.api.notification;

import java.math.BigDecimal;
import java.util.List;

/**
 * A customer email about one order. The order service publishes it inside its transaction and it is
 * sent only after that transaction commits, so a rolled-back change never emails anyone.
 */
public record OrderEmail(Kind kind, String to, String customerName, String orderNumber, BigDecimal total,
                         List<Line> lines, String shippingAddress) {

    public enum Kind { PLACED, CONFIRMED, SHIPPED, DELIVERED, CANCELLED }

    public record Line(String name, int quantity, BigDecimal lineTotal) { }
}
