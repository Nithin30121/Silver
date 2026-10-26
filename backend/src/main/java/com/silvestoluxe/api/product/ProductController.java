package com.silvestoluxe.api.product;

import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import static com.silvestoluxe.api.product.ProductDtos.*;

@RestController
@RequestMapping("/api")
@Validated
public class ProductController {
    private final ProductService products;
    private final ProductImageService images;
    public ProductController(ProductService products, ProductImageService images) {
        this.products = products;
        this.images = images;
    }

    @GetMapping("/products")
    public Page<Response> products(@RequestParam(required = false) UUID categoryId,
                                   @RequestParam(required = false) String query,
                                   Pageable pageable) {
        return products.activeProducts(categoryId, query, pageable);
    }

    @GetMapping("/products/{id}")
    public Response product(@PathVariable UUID id) { return products.byId(id); }

    @GetMapping("/admin/products")
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public Page<Response> allProducts(@RequestParam(required = false) UUID categoryId,
                                      @RequestParam(required = false) String query,
                                      Pageable pageable) {
        return products.allProducts(categoryId, query, pageable);
    }

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

    @GetMapping("/admin/products/{id}/images")
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public java.util.List<ImageResponse> images(@PathVariable UUID id) { return images.images(id); }

    @PostMapping(value = "/admin/products/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public ImageResponse uploadImage(@PathVariable UUID id,
                                     @RequestPart("file") MultipartFile file,
                                     @RequestParam(required = false) String altText,
                                     @RequestParam(required = false) @Min(0) Integer displayOrder) {
        return images.upload(id, file, altText, displayOrder);
    }

    @DeleteMapping("/admin/products/{productId}/images/{imageId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public void deleteImage(@PathVariable UUID productId, @PathVariable UUID imageId) {
        images.delete(productId, imageId);
    }
}
