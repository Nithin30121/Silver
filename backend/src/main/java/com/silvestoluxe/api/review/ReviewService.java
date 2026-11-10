package com.silvestoluxe.api.review;

import static com.silvestoluxe.api.review.ReviewDtos.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.silvestoluxe.api.account.AccountProfileService;
import com.silvestoluxe.api.product.Product;
import com.silvestoluxe.api.product.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Product reviews: one per customer per product, shown on the product page once an admin approves them. The
 * rating and the count use approved reviews only, and "verified purchase" is checked against delivered orders.
 */
@Service
@Transactional(readOnly = true)
public class ReviewService {
    static final int MAX_PUBLIC_PAGE_SIZE = 20;
    static final int MAX_ADMIN_PAGE_SIZE = 100;
    static final String FALLBACK_NAME = "SILVORA customer";

    private final ProductReviewRepository reviews;
    private final ProductRepository products;
    private final AccountProfileService profiles;
    private final Clock clock;

    @Autowired
    public ReviewService(ProductReviewRepository reviews, ProductRepository products, AccountProfileService profiles) {
        this(reviews, products, profiles, Clock.systemUTC());
    }

    ReviewService(ProductReviewRepository reviews, ProductRepository products, AccountProfileService profiles, Clock clock) {
        this.reviews = reviews;
        this.products = products;
        this.profiles = profiles;
        this.clock = clock;
    }

    /** Approved reviews of a live product, newest first, with the rating worked out from approved reviews only. */
    public ProductReviews forProduct(UUID productId, int page, int size) {
        liveProduct(productId);
        long[] byStars = new long[5];
        for (ProductReviewRepository.RatingCount count : reviews.countRatings(productId, ReviewStatus.APPROVED)) {
            if (count.getRating() >= 1 && count.getRating() <= 5) byStars[count.getRating() - 1] = count.getTotal();
        }
        long total = Arrays.stream(byStars).sum();
        long stars = 0;
        for (int index = 0; index < 5; index++) stars += byStars[index] * (index + 1);
        BigDecimal average = total == 0 ? null
                : BigDecimal.valueOf(stars).divide(BigDecimal.valueOf(total), 1, RoundingMode.HALF_UP);

        Page<ProductReview> found = reviews.findByProductIdAndStatusOrderByCreatedAtDesc(productId, ReviewStatus.APPROVED,
                PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PUBLIC_PAGE_SIZE)));
        Set<UUID> verified = verifiedCustomers(productId, found.getContent().stream().map(ProductReview::getCustomerId).toList());
        List<PublicReview> shown = found.getContent().stream()
                .map(review -> new PublicReview(review.getId(), review.getRating(), review.getComment(), review.getReviewerName(),
                        review.shownDate(), verified.contains(review.getCustomerId())))
                .toList();
        return new ProductReviews(average, total, Arrays.stream(byStars).boxed().toList(), shown,
                found.getNumber(), found.getTotalPages(), found.hasNext());
    }

    /** The signed-in customer's own review of the product, or null when they haven't written one. */
    public MyReview mine(UUID productId, String subject) {
        UUID customerId = profiles.currentUser(subject).id();
        return reviews.findByProductIdAndCustomerId(productId, customerId).map(this::myReview).orElse(null);
    }

    /** Writes the customer's review of the product, or replaces their existing one; either way it waits for approval. */
    @Transactional
    public MyReview save(UUID productId, String subject, ReviewRequest request) {
        liveProduct(productId);
        AccountProfileService.CurrentUser customer = profiles.currentUser(subject);
        String comment = text(request.comment());
        if (comment.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please write a few words about the piece.");
        String name = reviewerName(customer.fullName());
        ProductReview review = reviews.findByProductIdAndCustomerId(productId, customer.id()).orElse(null);
        if (review != null) {
            review.edit(request.rating(), comment, name, clock.instant());
            return myReview(review);
        }
        try {
            return myReview(reviews.saveAndFlush(new ProductReview(productId, customer.id(), request.rating(), comment, name)));
        } catch (DataIntegrityViolationException exception) {
            // Two first reviews sent at once: the database keeps one per customer, so the second is refused.
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You've already reviewed this piece. Refresh the page to edit your review.");
        }
    }

    /** Newest first; status null lists every review. */
    public Page<AdminReview> list(ReviewStatus status, int page, int size) {
        PageRequest request = PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_ADMIN_PAGE_SIZE));
        Page<ProductReview> found = status == null ? reviews.findAllByOrderByCreatedAtDesc(request)
                : reviews.findByStatusOrderByCreatedAtDesc(status, request);
        Map<UUID, Product> named = products.findAllById(found.getContent().stream().map(ProductReview::getProductId).distinct().toList())
                .stream().collect(Collectors.toMap(Product::getId, Function.identity()));
        Set<UUID> verified = new HashSet<>();
        found.getContent().stream().collect(Collectors.groupingBy(ProductReview::getProductId))
                .forEach((productId, group) -> verified.addAll(verifiedPairs(productId, group)));
        return found.map(review -> adminReview(review, named.get(review.getProductId()), verified.contains(review.getId())));
    }

    @Transactional
    public AdminReview updateStatus(UUID id, ReviewStatus status) {
        ProductReview review = reviews.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found."));
        if (review.getStatus() != status) review.moderate(status, clock.instant());
        Product product = products.findById(review.getProductId()).orElse(null);
        boolean verified = !verifiedCustomers(review.getProductId(), List.of(review.getCustomerId())).isEmpty();
        return adminReview(review, product, verified);
    }

    @Transactional
    public void delete(UUID id) {
        ProductReview review = reviews.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review not found."));
        reviews.delete(review);
    }

    private Product liveProduct(UUID productId) {
        return products.findById(productId).filter(Product::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found."));
    }

    private Set<UUID> verifiedCustomers(UUID productId, Collection<UUID> customerIds) {
        if (customerIds.isEmpty()) return Set.of();
        return new HashSet<>(reviews.customersWithDeliveredOrder(productId, new HashSet<>(customerIds)));
    }

    /** The ids of the reviews in this group (all of one product) whose writer has received that product. */
    private List<UUID> verifiedPairs(UUID productId, List<ProductReview> group) {
        Set<UUID> customers = verifiedCustomers(productId, group.stream().map(ProductReview::getCustomerId).toList());
        List<UUID> ids = new ArrayList<>();
        for (ProductReview review : group) if (customers.contains(review.getCustomerId())) ids.add(review.getId());
        return ids;
    }

    private MyReview myReview(ProductReview review) {
        boolean verified = !verifiedCustomers(review.getProductId(), List.of(review.getCustomerId())).isEmpty();
        return new MyReview(review.getId(), review.getRating(), review.getComment(), review.getReviewerName(),
                review.getStatus(), review.shownDate(), verified);
    }

    private static AdminReview adminReview(ProductReview review, Product product, boolean verified) {
        return new AdminReview(review.getId(), review.getProductId(), product == null ? "Removed product" : product.getName(),
                product == null ? null : product.getSlug(), review.getRating(), review.getComment(), review.getReviewerName(),
                review.getStatus(), verified, review.getCreatedAt(), review.getEditedAt(), review.getModeratedAt());
    }

    /**
     * The name shown with a review: the first name and the last name's initial ("Priya K."), so a customer's
     * full name isn't published. Without a name on the profile it says "SILVORA customer"; the email is never used.
     */
    static String reviewerName(String fullName) {
        if (fullName == null || fullName.isBlank()) return FALLBACK_NAME;
        String[] parts = fullName.replaceAll("[\\p{Cntrl}]", "").trim().split("\\s+");
        String first = parts[0].length() > 40 ? parts[0].substring(0, 40) : parts[0];
        if (parts.length == 1) return first;
        String last = parts[parts.length - 1];
        return first + " " + last.substring(0, last.offsetByCodePoints(0, 1)).toUpperCase() + ".";
    }

    /** The review keeps its line breaks (at most two in a row) but drops other control characters. */
    static String text(String value) {
        if (value == null) return "";
        return value.replace("\r\n", "\n").replaceAll("[\\p{Cntrl}&&[^\n]]", "").replaceAll("\n{3,}", "\n\n").trim();
    }
}
