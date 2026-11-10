package com.silvestoluxe.api.review;

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

/** One customer's review of one product. */
@Entity
@Table(name = "product_reviews", schema = "public")
public class ProductReview {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "product_id", nullable = false, updatable = false) private UUID productId;
    @Column(name = "customer_id", nullable = false, updatable = false) private UUID customerId;
    @Column(nullable = false) private int rating;
    @Column(nullable = false) private String comment;
    @Column(name = "reviewer_name", nullable = false) private String reviewerName;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private ReviewStatus status = ReviewStatus.PENDING;
    @CreationTimestamp @Column(nullable = false, updatable = false) private Instant createdAt;
    private Instant editedAt;
    private Instant moderatedAt;

    protected ProductReview() { }

    public ProductReview(UUID productId, UUID customerId, int rating, String comment, String reviewerName) {
        this.productId = productId;
        this.customerId = customerId;
        this.rating = rating;
        this.comment = comment;
        this.reviewerName = reviewerName;
    }

    public UUID getId() { return id; }
    public UUID getProductId() { return productId; }
    public UUID getCustomerId() { return customerId; }
    public int getRating() { return rating; }
    public String getComment() { return comment; }
    public String getReviewerName() { return reviewerName; }
    public ReviewStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getEditedAt() { return editedAt; }
    public Instant getModeratedAt() { return moderatedAt; }

    /** The date shown with the review: when it was last written. */
    public Instant shownDate() { return editedAt != null ? editedAt : createdAt; }

    /** A changed review goes back to waiting for approval, so an approved one can't be swapped for anything else. */
    public void edit(int rating, String comment, String reviewerName, Instant at) {
        this.rating = rating;
        this.comment = comment;
        this.reviewerName = reviewerName;
        this.status = ReviewStatus.PENDING;
        this.editedAt = at;
        this.moderatedAt = null;
    }

    public void moderate(ReviewStatus status, Instant at) {
        this.status = status;
        this.moderatedAt = status == ReviewStatus.PENDING ? null : at;
    }
}
