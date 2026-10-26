package com.silvestoluxe.api.product;

import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import static com.silvestoluxe.api.product.ProductDtos.*;

@RestController
@RequestMapping("/api")
public class ProductController {
    private final ProductService products;
    public ProductController(ProductService products) { this.products = products; }

    @GetMapping("/products")
    public Page<Response> products(@RequestParam(required = false) UUID categoryId,
                                   @RequestParam(required = false) String query,
                                   Pageable pageable) {
        return products.activeProducts(categoryId, query, pageable);
    }

    @GetMapping("/products/{id}")
    public Response product(@PathVariable UUID id) { return products.byId(id); }

    @PostMapping("/admin/products") @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public Response create(@RequestBody @Valid Upsert request) { return products.create(request); }

    @PutMapping("/admin/products/{id}") @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public Response update(@PathVariable UUID id, @RequestBody @Valid Upsert request) { return products.update(id, request); }

    @PatchMapping("/admin/products/{id}/status") @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public Response status(@PathVariable UUID id, @RequestBody @Valid Status request) { return products.updateStatus(id, request); }

    @PostMapping("/admin/products/{id}/categories/{categoryId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public void addCategory(@PathVariable UUID id, @PathVariable UUID categoryId) { products.addCategory(id, categoryId); }

    @DeleteMapping("/admin/products/{id}/categories/{categoryId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public void removeCategory(@PathVariable UUID id, @PathVariable UUID categoryId) { products.removeCategory(id, categoryId); }
}
