package com.silvestoluxe.api.category;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
    List<Category> findByIsActiveTrueOrderByDisplayOrderAscNameAsc();
    List<Category> findAllByOrderByDisplayOrderAscNameAsc();
    boolean existsByParentId(UUID parentId);

    @Query(value = "select exists (select 1 from public.category_products where category_id = :categoryId)", nativeQuery = true)
    boolean existsProductAssignment(UUID categoryId);
}
