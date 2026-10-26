package com.silvestoluxe.api.product;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductImageRepository extends JpaRepository<ProductImage, UUID> {
    Optional<ProductImage> findByIdAndProductId(UUID id, UUID productId);
    Optional<ProductImage> findFirstByProductIdOrderByDisplayOrderAscCreatedAtAsc(UUID productId);
    Optional<ProductImage> findFirstByProductIdOrderByDisplayOrderDesc(UUID productId);
    List<ProductImage> findByProductIdOrderByDisplayOrderAscCreatedAtAsc(UUID productId);
}
