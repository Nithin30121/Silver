package com.silvestoluxe.api.product;

import static com.silvestoluxe.api.product.ProductDtos.*;
import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import com.silvestoluxe.api.category.Category;
import com.silvestoluxe.api.category.CategoryRepository;
import jakarta.persistence.criteria.Join;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class ProductService {
    private final ProductRepository products;
    private final ProductImageRepository images;
    private final CategoryRepository categories;
    private final StockLedger stock;
    public ProductService(ProductRepository products, ProductImageRepository images, CategoryRepository categories, StockLedger stock) {
        this.products = products;
        this.images = images;
        this.categories = categories;
        this.stock = stock;
    }

    public Page<Response> activeProducts(UUID categoryId, String query, Pageable pageable) {
        return matchingProducts(categoryId, query, pageable, true);
    }

    public Page<Response> allProducts(UUID categoryId, String query, Pageable pageable) {
        return matchingProducts(categoryId, query, pageable, null);
    }

    private Page<Response> matchingProducts(UUID categoryId, String query, Pageable pageable, Boolean active) {
        Specification<Product> spec = (root, criteria, builder) -> builder.conjunction();
        if (active != null) spec = spec.and((root, criteria, builder) -> builder.equal(root.get("isActive"), active));
        if (categoryId != null) spec = spec.and((root, criteria, builder) -> {
            criteria.distinct(true);
            Join<Product, Category> category = root.join("categories");
            return builder.equal(category.get("id"), categoryId);
        });
        if (query != null && !query.isBlank()) {
            String search = "%" + query.trim().toLowerCase() + "%";
            spec = spec.and((root, criteria, builder) -> builder.or(
                    builder.like(builder.lower(root.get("name")), search),
                    builder.like(builder.lower(root.get("slug")), search)));
        }
        return products.findAll(spec, pageable).map(this::response);
    }

    public Response byId(UUID id) {
        Product product = find(id);
        if (!product.isActive()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found.");
        return response(product);
    }

    @Transactional
    public Response create(Upsert request, UUID actorId) {
        Product product = new Product();
        apply(product, request);
        Product saved = products.save(product);
        stock.record(saved, saved.getStockQuantity(), StockMovementReason.INITIAL, null, actorId);
        return response(saved);
    }

    @Transactional
    public Response update(UUID id, Upsert request, UUID actorId) {
        // Locked like checkout, so the recorded change is measured from the count actually in the database.
        Product product = products.findByIdForStockUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found."));
        int before = product.getStockQuantity();
        apply(product, request);
        stock.record(product, product.getStockQuantity() - before, StockMovementReason.MANUAL, null, actorId);
        return response(product);
    }

    @Transactional
    public Response updateStatus(UUID id, Status request) {
        Product product = find(id);
        product.setActive(request.isActive());
        return response(product);
    }

    /**
     * Deletes a product for good and returns where its photos are stored, so they can be removed once this commits.
     * Past orders keep their own copy of its name, SKU and price; the database clears their link to it and removes
     * its photo records, category places, stock history and wishlist counts with it.
     */
    @Transactional
    public List<String> delete(UUID id) {
        Product product = find(id);
        List<ProductImage> photos = images.findByProductIdOrderByDisplayOrderAscCreatedAtAsc(id);
        List<String> photoPaths = photos.stream().map(ProductImage::getStoragePath).toList();
        // Removed first and by name: a loaded photo record still pointing at a deleted product makes Hibernate refuse to flush.
        images.deleteAll(photos);
        products.delete(product);
        // Fails here, inside the transaction, rather than after the photos are already gone.
        products.flush();
        return photoPaths;
    }

    @Transactional
    public void addCategory(UUID productId, UUID categoryId) {
        Product product = find(productId);
        product.getCategories().add(category(categoryId));
    }

    @Transactional
    public void removeCategory(UUID productId, UUID categoryId) {
        Product product = find(productId);
        product.getCategories().removeIf(category -> category.getId().equals(categoryId));
    }

    private void apply(Product product, Upsert request) {
        product.setName(request.name().trim());
        product.setSlug(request.slug().trim());
        product.setSku(blankToNull(request.sku()));
        product.setDescription(request.description() == null ? "" : request.description().trim());
        product.setPrice(request.price());
        product.setOriginalPrice(discountedFrom(request.originalPrice(), request.price()));
        product.setImageUrl(blankToNull(request.imageUrl()));
        product.setWeightGrams(request.weightGrams());
        product.setStockQuantity(request.stockQuantity());
        product.setActive(request.isActive());
        Set<Category> assigned = new LinkedHashSet<>();
        if (request.categoryIds() != null) request.categoryIds().forEach(id -> assigned.add(category(id)));
        product.setCategories(assigned);
    }

    private Product find(UUID id) {
        return products.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found."));
    }
    private Category category(UUID id) {
        return categories.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category does not exist."));
    }
    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    /** An original price only means a discount when it is above the price; anything else shows no discount. */
    static BigDecimal discountedFrom(BigDecimal originalPrice, BigDecimal price) {
        return originalPrice != null && price != null && originalPrice.compareTo(price) > 0 ? originalPrice : null;
    }

    private Response response(Product product) {
        return new Response(product.getId(), product.getName(), product.getSlug(), product.getSku(), product.getDescription(),
                product.getPrice(), product.getOriginalPrice(), product.getImageUrl(), product.getWeightGrams(), product.getStockQuantity(), product.isActive(),
                product.getCategories().stream().map(Category::getId).collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new)),
                product.getImages().stream().map(image -> new ImageResponse(image.getId(), image.getImageUrl(), image.getAltText(), image.getDisplayOrder())).toList());
    }
}
