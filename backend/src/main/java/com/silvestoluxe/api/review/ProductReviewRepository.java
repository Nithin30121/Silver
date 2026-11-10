package com.silvestoluxe.api.review;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface ProductReviewRepository extends JpaRepository<ProductReview, UUID> {
    Optional<ProductReview> findByProductIdAndCustomerId(UUID productId, UUID customerId);

    Page<ProductReview> findByProductIdAndStatusOrderByCreatedAtDesc(UUID productId, ReviewStatus status, Pageable pageable);

    Page<ProductReview> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<ProductReview> findByStatusOrderByCreatedAtDesc(ReviewStatus status, Pageable pageable);

    /** How many reviews of one product have each star rating, for that status. Ratings with none are left out. */
    @Query("select review.rating as rating, count(review) as total from ProductReview review "
            + "where review.productId = :productId and review.status = :status group by review.rating")
    List<RatingCount> countRatings(@Param("productId") UUID productId, @Param("status") ReviewStatus status);

    /**
     * Which of these customers have a delivered order containing the product: a completed purchase, so their
     * review is marked as verified. Worked out when asked, so a review becomes verified once the order arrives.
     */
    @Query(value = """
            select distinct o.customer_id from public.orders o
            join public.order_items i on i.order_id = o.id
            where i.product_id = :productId and o.status = 'DELIVERED' and o.customer_id in (:customerIds)
            """, nativeQuery = true)
    List<UUID> customersWithDeliveredOrder(@Param("productId") UUID productId, @Param("customerIds") Collection<UUID> customerIds);

    interface RatingCount {
        int getRating();
        long getTotal();
    }
}
