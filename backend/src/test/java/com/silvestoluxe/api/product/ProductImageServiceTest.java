package com.silvestoluxe.api.product;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import com.silvestoluxe.api.storage.SupabaseStorageClient;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

class ProductImageServiceTest {

    @Test
    void rejectsAFileThatIsNotAnAllowedImageFormat() throws Exception {
        ProductRepository products = mock(ProductRepository.class);
        ProductImageRepository images = mock(ProductImageRepository.class);
        SupabaseStorageClient storage = mock(SupabaseStorageClient.class);
        Product product = mock(Product.class);
        MultipartFile file = mock(MultipartFile.class);
        UUID productId = UUID.randomUUID();
        when(products.findById(productId)).thenReturn(Optional.of(product));
        when(file.isEmpty()).thenReturn(false);
        when(file.getSize()).thenReturn(4L);
        when(file.getBytes()).thenReturn(new byte[] { 'n', 'o', 'p', 'e' });

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> new ProductImageService(products, images, storage).upload(productId, file, "", null));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    void uploadsVerifiedPngToAProductSpecificGeneratedPath() throws Exception {
        ProductRepository products = mock(ProductRepository.class);
        ProductImageRepository images = mock(ProductImageRepository.class);
        SupabaseStorageClient storage = mock(SupabaseStorageClient.class);
        Product product = mock(Product.class);
        MultipartFile file = mock(MultipartFile.class);
        UUID productId = UUID.randomUUID();
        byte[] png = new byte[] { (byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a };

        when(products.findById(productId)).thenReturn(Optional.of(product));
        when(file.isEmpty()).thenReturn(false);
        when(file.getSize()).thenReturn((long) png.length);
        when(file.getBytes()).thenReturn(png);
        when(images.findFirstByProductIdOrderByDisplayOrderDesc(productId)).thenReturn(Optional.empty());
        when(storage.publicUrl(any(String.class))).thenReturn("https://cdn.example/product.png");
        when(images.saveAndFlush(any(ProductImage.class))).thenAnswer(invocation -> invocation.getArgument(0));

        new ProductImageService(products, images, storage).upload(productId, file, "Ring front view", null);

        verify(storage).upload(org.mockito.ArgumentMatchers.startsWith(productId + "/"), eq(png), eq("image/png"));
        verify(product).setImageUrl("https://cdn.example/product.png");
    }
}
