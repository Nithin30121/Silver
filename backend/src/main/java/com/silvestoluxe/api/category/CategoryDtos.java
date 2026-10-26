package com.silvestoluxe.api.category;

import java.util.List;
import java.util.UUID;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public final class CategoryDtos {
    private CategoryDtos() { }

    public record Upsert(
            @NotBlank String name,
            @NotBlank @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$") String slug,
            UUID parentId,
            @NotBlank @Pattern(regexp = "^(audience|collection|items)$") String categoryType,
            String description,
            String imageUrl,
            @Min(0) int displayOrder,
            boolean isActive) { }

    public record Status(boolean isActive) { }

    public record Response(UUID id, String name, String slug, UUID parentId, String categoryType,
                           String description, String imageUrl, int displayOrder, boolean isActive,
                           List<Response> children) { }
}
