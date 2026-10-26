package com.silvestoluxe.api.product;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.silvestoluxe.api.category.Category;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "products", schema = "public")
public class Product {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false) private String name;
    @Column(nullable = false) private String slug;
    private String sku;
    @Column(nullable = false) private String description;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal price;
    private String imageUrl;
    @Column(precision = 10, scale = 3) private BigDecimal weightGrams;
    @Column(nullable = false) private int stockQuantity;
    @Column(nullable = false) private boolean isActive;
    @CreationTimestamp @Column(nullable = false, updatable = false) private Instant createdAt;
    @UpdateTimestamp @Column(nullable = false) private Instant updatedAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(schema = "public", name = "category_products",
            joinColumns = @JoinColumn(name = "product_id"),
            inverseJoinColumns = @JoinColumn(name = "category_id"))
    private Set<Category> categories = new LinkedHashSet<>();

    @OneToMany(mappedBy = "product", fetch = FetchType.LAZY)
    @OrderBy("displayOrder ASC, createdAt ASC")
    private List<ProductImage> images = new ArrayList<>();

    protected Product() { }
    public UUID getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public BigDecimal getWeightGrams() { return weightGrams; }
    public void setWeightGrams(BigDecimal weightGrams) { this.weightGrams = weightGrams; }
    public int getStockQuantity() { return stockQuantity; }
    public void setStockQuantity(int stockQuantity) { this.stockQuantity = stockQuantity; }
    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }
    public Set<Category> getCategories() { return categories; }
    public void setCategories(Set<Category> categories) { this.categories = categories; }
    public List<ProductImage> getImages() { return images; }
}
