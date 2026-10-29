package com.silvestoluxe.api.notification;

/**
 * A piece has just dropped to the low-stock line, or sold out. Published by the stock history inside
 * the change's transaction and emailed to the shop only after it commits.
 *
 * @param orderNumber the order that took the stock, or null when an admin changed it by hand
 */
public record LowStockAlert(String productName, String sku, int quantityLeft, boolean soldOut, String orderNumber) { }
