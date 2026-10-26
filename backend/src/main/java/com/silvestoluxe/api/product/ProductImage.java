package com.silvestoluxe.api.product;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "product_images", schema = "public")
public class ProductImage {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false) private String storagePath;
    private String imageUrl;
    @Column(nullable = false) private String altText;
    @Column(nullable = false) private int displayOrder;
    @CreationTimestamp @Column(nullable = false, updatable = false) private Instant createdAt;

    protected ProductImage() { }

    public ProductImage(Product product, String storagePath, String imageUrl, String altText, int displayOrder) {
        this.product = product;
        this.storagePath = storagePath;
        this.imageUrl = imageUrl;
        this.altText = altText;
        this.displayOrder = displayOrder;
    }

    public UUID getId() { return id; }
    public Product getProduct() { return product; }
    public String getStoragePath() { return storagePath; }
    public String getImageUrl() { return imageUrl; }
    public String getAltText() { return altText; }
    public int getDisplayOrder() { return displayOrder; }
    public Instant getCreatedAt() { return createdAt; }
}
