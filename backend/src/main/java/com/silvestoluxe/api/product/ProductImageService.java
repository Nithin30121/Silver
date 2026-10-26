package com.silvestoluxe.api.product;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

import com.silvestoluxe.api.storage.SupabaseStorageClient;
import com.silvestoluxe.api.storage.SupabaseStorageException;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class ProductImageService {
    private static final int MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    private final ProductRepository products;
    private final ProductImageRepository images;
    private final SupabaseStorageClient storage;

    public ProductImageService(ProductRepository products, ProductImageRepository images, SupabaseStorageClient storage) {
        this.products = products;
        this.images = images;
        this.storage = storage;
    }

    public List<ProductDtos.ImageResponse> images(UUID productId) {
        findProduct(productId);
        return images.findByProductIdOrderByDisplayOrderAscCreatedAtAsc(productId).stream().map(this::response).toList();
    }

    @Transactional
    public ProductDtos.ImageResponse upload(UUID productId, MultipartFile file, String altText, @Min(0) Integer requestedOrder) {
        Product product = findProduct(productId);
        if (requestedOrder != null && requestedOrder < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image display order cannot be negative.");
        }
        ImageData image = validate(file);
        int displayOrder = requestedOrder == null
                ? images.findFirstByProductIdOrderByDisplayOrderDesc(productId).map(existing -> existing.getDisplayOrder() + 1).orElse(0)
                : requestedOrder;
        String path = productId + "/" + UUID.randomUUID() + image.extension();
        String url;
        try {
            storage.upload(path, image.content(), image.contentType());
            url = storage.publicUrl(path);
        } catch (SupabaseStorageException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Product image upload failed.");
        }

        try {
            ProductImage productImage = images.saveAndFlush(new ProductImage(product, path, url, cleanAltText(altText), displayOrder));
            if (product.getImageUrl() == null) product.setImageUrl(url);
            return response(productImage);
        } catch (RuntimeException exception) {
            try {
                storage.delete(path);
            } catch (SupabaseStorageException ignored) {
                // The failed metadata write remains the caller's error; a later storage audit can remove an orphan.
            }
            throw exception;
        }
    }

    @Transactional
    public void delete(UUID productId, UUID imageId) {
        ProductImage image = images.findByIdAndProductId(imageId, productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product image not found."));
        try {
            storage.delete(image.getStoragePath());
        } catch (SupabaseStorageException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Product image deletion failed.");
        }
        Product product = findProduct(productId);
        boolean wasPrimary = image.getImageUrl().equals(product.getImageUrl());
        images.delete(image);
        images.flush();
        if (wasPrimary) product.setImageUrl(images.findFirstByProductIdOrderByDisplayOrderAscCreatedAtAsc(productId)
                .map(ProductImage::getImageUrl).orElse(null));
    }

    private Product findProduct(UUID productId) {
        return products.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found."));
    }

    private ImageData validate(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose an image file.");
        if (file.getSize() > MAX_IMAGE_BYTES) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Images must be 5 MB or smaller.");
        try {
            byte[] content = file.getBytes();
            ImageKind kind = ImageKind.detect(content);
            if (kind == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only JPEG, PNG, and WebP images are allowed.");
            return new ImageData(content, kind.contentType, kind.extension);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read the uploaded image.");
        }
    }

    private String cleanAltText(String altText) {
        return altText == null ? "" : altText.trim().substring(0, Math.min(altText.trim().length(), 250));
    }

    private ProductDtos.ImageResponse response(ProductImage image) {
        return new ProductDtos.ImageResponse(image.getId(), image.getImageUrl(), image.getAltText(), image.getDisplayOrder());
    }

    private record ImageData(byte[] content, String contentType, String extension) { }

    private enum ImageKind {
        JPEG("image/jpeg", ".jpg"), PNG("image/png", ".png"), WEBP("image/webp", ".webp");

        private final String contentType;
        private final String extension;
        ImageKind(String contentType, String extension) { this.contentType = contentType; this.extension = extension; }

        static ImageKind detect(byte[] bytes) {
            if (bytes.length >= 3 && (bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xd8 && (bytes[2] & 0xff) == 0xff) return JPEG;
            if (bytes.length >= 8 && bytes[0] == (byte) 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4e && bytes[3] == 0x47
                    && bytes[4] == 0x0d && bytes[5] == 0x0a && bytes[6] == 0x1a && bytes[7] == 0x0a) return PNG;
            if (bytes.length >= 12 && bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46
                    && bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50) return WEBP;
            return null;
        }
    }
}
