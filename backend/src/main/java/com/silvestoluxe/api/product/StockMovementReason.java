package com.silvestoluxe.api.product;

/** Why a product's stock count changed. */
public enum StockMovementReason {
    /** Stock entered when the product was created. */
    INITIAL,
    /** An admin changed the count on the product form. */
    MANUAL,
    /** A customer's checkout reserved the pieces. */
    SALE,
    /** A cancelled order returned its pieces. */
    CANCELLATION
}
