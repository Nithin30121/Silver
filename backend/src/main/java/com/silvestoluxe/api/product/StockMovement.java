package com.silvestoluxe.api.product;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

/** Append-only stock history row. Plain ids keep it independent of the product and order mappings. */
@Entity
@Table(name = "stock_movements", schema = "public")
public class StockMovement {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(nullable = false, updatable = false) private UUID productId;
    @Column(nullable = false, updatable = false) private int quantityChange;
    @Column(nullable = false, updatable = false) private int quantityAfter;
    @Enumerated(EnumType.STRING) @Column(nullable = false, updatable = false) private StockMovementReason reason;
    @Column(updatable = false) private UUID orderId;
    @Column(updatable = false) private UUID actorId;
    @CreationTimestamp @Column(nullable = false, updatable = false) private Instant createdAt;

    protected StockMovement() { }

    StockMovement(UUID productId, int quantityChange, int quantityAfter, StockMovementReason reason, UUID orderId, UUID actorId) {
        this.productId = productId;
        this.quantityChange = quantityChange;
        this.quantityAfter = quantityAfter;
        this.reason = reason;
        this.orderId = orderId;
        this.actorId = actorId;
    }

    public UUID getProductId() { return productId; }
    public int getQuantityChange() { return quantityChange; }
    public int getQuantityAfter() { return quantityAfter; }
    public StockMovementReason getReason() { return reason; }
    public UUID getOrderId() { return orderId; }
    public UUID getActorId() { return actorId; }
}
