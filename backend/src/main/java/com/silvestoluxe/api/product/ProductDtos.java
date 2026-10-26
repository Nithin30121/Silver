package com.silvestoluxe.api.product;

import java.math.BigDecimal;
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
            @NotNull @DecimalMin(value = "0.00") BigDecimal price,
            String imageUrl,
            @DecimalMin(value = "0.000") BigDecimal weightGrams,
            @Min(0) int stockQuantity,
            boolean isActive,
            Set<UUID> categoryIds) { }

    public record Status(boolean isActive) { }

    public record ImageResponse(UUID id, String imageUrl, String altText, int displayOrder) { }

    public record Response(UUID id, String name, String slug, String sku, String description,
                           BigDecimal price, String imageUrl, BigDecimal weightGrams, int stockQuantity,
                           boolean isActive, Set<UUID> categoryIds, List<ImageResponse> images) { }
}
