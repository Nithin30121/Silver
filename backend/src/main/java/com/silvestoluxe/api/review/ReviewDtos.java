package com.silvestoluxe.api.review;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class ReviewDtos {
    private ReviewDtos() { }

    public record ReviewRequest(
            @NotNull(message = "Please choose a star rating.") @Min(value = 1, message = "Please choose a star rating.")
            @Max(value = 5, message = "Please choose a star rating.") Integer rating,
            @NotBlank(message = "Please write a few words about the piece.")
            @Size(max = 2000, message = "Please keep your review under 2,000 characters.") String comment) { }

    /** A review as anyone can see it on the product page. */
    public record PublicReview(UUID id, int rating, String comment, String reviewerName, Instant date, boolean verifiedPurchase) { }

    /**
     * The product page's reviews: averageRating and reviewCount cover approved reviews only (averageRating is
     * null while there are none), ratingCounts holds how many have 1 to 5 stars, and reviews is one page of them.
     */
    public record ProductReviews(BigDecimal averageRating, long reviewCount, List<Long> ratingCounts,
                                 List<PublicReview> reviews, int page, int totalPages, boolean hasMore) { }

    /** The signed-in customer's own review of a product, whatever its status. */
    public record MyReview(UUID id, int rating, String comment, String reviewerName, ReviewStatus status,
                           Instant date, boolean verifiedPurchase) { }

    public record AdminReview(UUID id, UUID productId, String productName, String productSlug, int rating, String comment,
                              String reviewerName, ReviewStatus status, boolean verifiedPurchase, Instant createdAt,
                              Instant editedAt, Instant moderatedAt) { }

    public record StatusUpdate(@NotNull ReviewStatus status) { }
}
