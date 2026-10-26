package com.silvestoluxe.api.order;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "order_items", schema = "public")
public class OrderItem {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "order_id", nullable = false) private CustomerOrder order;
    @Column(name = "product_id") private UUID productId;
    @Column(nullable = false) private String productName;
    private String productSku;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal unitPrice;
    @Column(nullable = false) private int quantity;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal lineTotal;
    @CreationTimestamp @Column(nullable = false, updatable = false) private Instant createdAt;
    protected OrderItem() { }
    public OrderItem(CustomerOrder order, UUID productId, String productName, String productSku, BigDecimal unitPrice, int quantity) {
        this.order = order; this.productId = productId; this.productName = productName; this.productSku = productSku;
        this.unitPrice = unitPrice; this.quantity = quantity; this.lineTotal = unitPrice.multiply(BigDecimal.valueOf(quantity));
    }
    public UUID getId() { return id; }
    public UUID getProductId() { return productId; }
    public String getProductName() { return productName; }
    public String getProductSku() { return productSku; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public int getQuantity() { return quantity; }
    public BigDecimal getLineTotal() { return lineTotal; }
}
