package com.silvestoluxe.api.review;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.silvestoluxe.api.account.AccountProfileService;
import com.silvestoluxe.api.product.Product;
import com.silvestoluxe.api.product.ProductRepository;
import com.silvestoluxe.api.product.TestProducts;
import com.silvestoluxe.api.review.ReviewDtos.ProductReviews;
import com.silvestoluxe.api.review.ReviewDtos.ReviewRequest;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

class ReviewServiceTest {
    private static final Instant NOW = Instant.parse("2026-11-10T09:00:00Z");

    private final ProductReviewRepository reviews = mock(ProductReviewRepository.class);
    private final ProductRepository products = mock(ProductRepository.class);
    private final AccountProfileService profiles = mock(AccountProfileService.class);
    private final ReviewService service = new ReviewService(reviews, products, profiles, Clock.fixed(NOW, ZoneOffset.UTC));

    private Product liveProduct() {
        Product product = TestProducts.product("Aura Ring", new BigDecimal("2499"), 5);
        when(products.findById(product.getId())).thenReturn(Optional.of(product));
        return product;
    }

    private AccountProfileService.CurrentUser customer(String subject, String fullName) {
        AccountProfileService.CurrentUser user = new AccountProfileService.CurrentUser(UUID.fromString(subject), fullName,
                "asha@example.com", "customer", NOW, NOW);
        when(profiles.currentUser(subject)).thenReturn(user);
        return user;
    }

    private static ProductReview review(UUID productId, UUID customerId, int rating) {
        ProductReview review = new ProductReview(productId, customerId, rating, "Lovely piece.", "Asha R.");
        ReflectionTestUtils.setField(review, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(review, "createdAt", NOW);
        return review;
    }

    private static ReviewDtos.ReviewRequest request(int rating, String comment) { return new ReviewRequest(rating, comment); }

    private record Count(int getRating, long getTotal) implements ProductReviewRepository.RatingCount { }

    @Test
    void theRatingAndCountUseApprovedReviewsOnly() {
        Product product = liveProduct();
        when(reviews.countRatings(product.getId(), ReviewStatus.APPROVED)).thenReturn(List.of(new Count(5, 3), new Count(4, 1), new Count(2, 1)));
        when(reviews.findByProductIdAndStatusOrderByCreatedAtDesc(eq(product.getId()), eq(ReviewStatus.APPROVED), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 5), 5));

        ProductReviews result = service.forProduct(product.getId(), 0, 5);

        // (5*3 + 4 + 2) / 5 = 4.2
        assertEquals(new BigDecimal("4.2"), result.averageRating());
        assertEquals(5, result.reviewCount());
        assertEquals(List.of(0L, 1L, 0L, 1L, 3L), result.ratingCounts());
        verify(reviews, never()).countRatings(product.getId(), ReviewStatus.PENDING);
    }

    @Test
    void aProductWithoutApprovedReviewsHasNoAverage() {
        Product product = liveProduct();
        when(reviews.countRatings(product.getId(), ReviewStatus.APPROVED)).thenReturn(List.of());
        when(reviews.findByProductIdAndStatusOrderByCreatedAtDesc(eq(product.getId()), eq(ReviewStatus.APPROVED), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 5), 0));

        ProductReviews result = service.forProduct(product.getId(), 0, 5);

        assertNull(result.averageRating());
        assertEquals(0, result.reviewCount());
        assertFalse(result.hasMore());
    }

    @Test
    void marksOnlyReviewsFromCustomersWhoReceivedTheProductAsVerified() {
        Product product = liveProduct();
        UUID buyer = UUID.randomUUID();
        UUID browser = UUID.randomUUID();
        when(reviews.countRatings(product.getId(), ReviewStatus.APPROVED)).thenReturn(List.of(new Count(5, 2)));
        when(reviews.findByProductIdAndStatusOrderByCreatedAtDesc(eq(product.getId()), eq(ReviewStatus.APPROVED), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(review(product.getId(), buyer, 5), review(product.getId(), browser, 5)), PageRequest.of(0, 5), 2));
        when(reviews.customersWithDeliveredOrder(eq(product.getId()), anyCollection())).thenReturn(List.of(buyer));

        ProductReviews result = service.forProduct(product.getId(), 0, 5);

        assertTrue(result.reviews().get(0).verifiedPurchase());
        assertFalse(result.reviews().get(1).verifiedPurchase());
    }

    @Test
    void aHiddenOrMissingProductHasNoReviewsPage() {
        Product hidden = liveProduct();
        hidden.setActive(false);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> service.forProduct(hidden.getId(), 0, 5));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
    }

    @Test
    void aNewReviewWaitsForApprovalAndShowsAShortName() {
        Product product = liveProduct();
        String subject = UUID.randomUUID().toString();
        customer(subject, "Asha Ramanathan");
        when(reviews.findByProductIdAndCustomerId(eq(product.getId()), any())).thenReturn(Optional.empty());
        when(reviews.saveAndFlush(any(ProductReview.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ReviewDtos.MyReview saved = service.save(product.getId(), subject, request(5, "  Beautiful finish.\r\n\r\n\r\nWorth it.  "));

        assertEquals(ReviewStatus.PENDING, saved.status());
        assertEquals("Asha R.", saved.reviewerName());
        assertEquals("Beautiful finish.\n\nWorth it.", saved.comment());
    }

    @Test
    void editingAnApprovedReviewSendsItBackForApproval() {
        Product product = liveProduct();
        String subject = UUID.randomUUID().toString();
        AccountProfileService.CurrentUser user = customer(subject, "Asha Ramanathan");
        ProductReview existing = review(product.getId(), user.id(), 3);
        existing.moderate(ReviewStatus.APPROVED, NOW);
        when(reviews.findByProductIdAndCustomerId(product.getId(), user.id())).thenReturn(Optional.of(existing));

        ReviewDtos.MyReview saved = service.save(product.getId(), subject, request(4, "Even better after a month."));

        assertEquals(ReviewStatus.PENDING, existing.getStatus());
        assertEquals(4, existing.getRating());
        assertEquals(NOW, existing.getEditedAt());
        assertNull(existing.getModeratedAt());
        assertEquals(NOW, saved.date());
        verify(reviews, never()).saveAndFlush(any());
    }

    @Test
    void aSecondFirstReviewSentAtTheSameTimeIsRefused() {
        Product product = liveProduct();
        String subject = UUID.randomUUID().toString();
        customer(subject, "Asha Ramanathan");
        when(reviews.findByProductIdAndCustomerId(eq(product.getId()), any())).thenReturn(Optional.empty());
        when(reviews.saveAndFlush(any(ProductReview.class))).thenThrow(new DataIntegrityViolationException("product_reviews_one_per_customer"));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.save(product.getId(), subject, request(5, "Lovely.")));

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
    }

    @Test
    void aReviewMustSaySomething() {
        Product product = liveProduct();
        String subject = UUID.randomUUID().toString();
        customer(subject, "Asha");

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.save(product.getId(), subject, request(5, "\u0007\u0008")));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verify(reviews, never()).saveAndFlush(any());
    }

    @Test
    void anAdminDecisionIsRecorded() {
        Product product = liveProduct();
        ProductReview pending = review(product.getId(), UUID.randomUUID(), 5);
        when(reviews.findById(pending.getId())).thenReturn(Optional.of(pending));

        ReviewDtos.AdminReview approved = service.updateStatus(pending.getId(), ReviewStatus.APPROVED);

        assertEquals(ReviewStatus.APPROVED, approved.status());
        assertEquals(NOW, approved.moderatedAt());
        assertEquals("Aura Ring", approved.productName());
    }

    @Test
    void removingAReviewDeletesIt() {
        ProductReview review = review(UUID.randomUUID(), UUID.randomUUID(), 1);
        when(reviews.findById(review.getId())).thenReturn(Optional.of(review));

        service.delete(review.getId());

        ArgumentCaptor<ProductReview> deleted = ArgumentCaptor.forClass(ProductReview.class);
        verify(reviews).delete(deleted.capture());
        assertEquals(review.getId(), deleted.getValue().getId());
    }

    @Test
    void theNameShownNeverRevealsTheFullNameOrEmail() {
        assertEquals("Asha R.", ReviewService.reviewerName("Asha  Ramanathan"));
        assertEquals("Asha K.", ReviewService.reviewerName("Asha Lakshmi kumar"));
        assertEquals("Asha", ReviewService.reviewerName("Asha"));
        assertEquals(ReviewService.FALLBACK_NAME, ReviewService.reviewerName("   "));
        assertEquals(ReviewService.FALLBACK_NAME, ReviewService.reviewerName(null));
    }
}
