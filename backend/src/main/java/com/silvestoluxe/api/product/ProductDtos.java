package com.silvestoluxe.api.product;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;
import java.util.List;
import java.util.UUID;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public final class ProductDtos {
    private ProductDtos() { }

    public record Upsert(
            @NotBlank String name,
            @NotBlank @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$") String slug,
            String sku,
            String description,
            /** Above zero: a piece priced at nothing could be ordered for free. */
            @NotNull @DecimalMin(value = "0.00", inclusive = false, message = "Enter a price above ₹0.") BigDecimal price,
            /** The crossed-out price before a discount; kept only when higher than price. */
            @DecimalMin(value = "0.00") BigDecimal originalPrice,
            String imageUrl,
            @DecimalMin(value = "0.000") BigDecimal weightGrams,
            @Min(0) int stockQuantity,
            boolean isActive,
            Set<UUID> categoryIds,
            /** Shown in the home page's Considered Pieces. Left out keeps the current choice (a new piece starts unpicked). */
            Boolean isFeatured) { }

    public record Status(boolean isActive) { }

    public record ImageResponse(UUID id, String imageUrl, String altText, int displayOrder) { }

    public record Response(UUID id, String name, String slug, String sku, String description,
                           BigDecimal price, BigDecimal originalPrice, String imageUrl, BigDecimal weightGrams, int stockQuantity,
                           boolean isActive, Set<UUID> categoryIds, List<ImageResponse> images, boolean isFeatured) { }

    /** actorName is the admin who changed stock, or the customer whose checkout reserved it. */
    public record StockMovementResponse(UUID id, UUID productId, String productName, String productSku,
                                        int quantityChange, int quantityAfter, StockMovementReason reason,
                                        UUID orderId, String orderNumber, String actorName, Instant createdAt) { }
}
