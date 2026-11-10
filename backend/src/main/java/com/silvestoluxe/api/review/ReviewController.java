package com.silvestoluxe.api.review;

import static com.silvestoluxe.api.review.ReviewDtos.*;

import java.util.UUID;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ReviewController {
    private final ReviewService reviews;

    public ReviewController(ReviewService reviews) { this.reviews = reviews; }

    /** Open to everyone: a live product's approved reviews and its rating. */
    @GetMapping("/products/{productId}/reviews")
    public ProductReviews list(@PathVariable UUID productId,
                               @RequestParam(defaultValue = "0") int page,
                               @RequestParam(defaultValue = "5") int size) {
        return reviews.forProduct(productId, page, size);
    }

    /** The signed-in customer's own review of the product; 204 when they haven't written one. */
    @GetMapping("/me/reviews/{productId}")
    public ResponseEntity<MyReview> mine(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID productId) {
        MyReview review = reviews.mine(productId, jwt.getSubject());
        return review == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(review);
    }

    /** Writes or replaces the signed-in customer's review of the product. */
    @PutMapping("/me/reviews/{productId}")
    public MyReview save(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID productId, @RequestBody @Valid ReviewRequest request) {
        return reviews.save(productId, jwt.getSubject(), request);
    }

    @GetMapping("/admin/reviews")
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public Page<AdminReview> adminList(@RequestParam(required = false) ReviewStatus status,
                                       @RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "25") int size) {
        return reviews.list(status, page, size);
    }

    @PatchMapping("/admin/reviews/{id}/status")
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public AdminReview updateStatus(@PathVariable UUID id, @RequestBody @Valid StatusUpdate request) {
        return reviews.updateStatus(id, request.status());
    }

    @DeleteMapping("/admin/reviews/{id}")
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        reviews.delete(id);
    }
}
