package com.silvestoluxe.api.product;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.silvestoluxe.api.category.CategoryRepository;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class ProductServiceTest {

    @Test
    void anOriginalPriceAboveThePriceIsKeptAsTheDiscount() {
        ProductRepository products = mock(ProductRepository.class);
        when(products.save(any(Product.class))).thenAnswer(call -> call.getArgument(0));

        ProductDtos.Response ring = service(products, mock(ProductImageRepository.class))
                .create(upsert(new BigDecimal("2000.00"), new BigDecimal("2500.00")), UUID.randomUUID());

        assertEquals(new BigDecimal("2000.00"), ring.price());
        assertEquals(new BigDecimal("2500.00"), ring.originalPrice());
    }

    @Test
    void anOriginalPriceThatIsNotHigherShowsNoDiscount() {
        BigDecimal price = new BigDecimal("2000.00");
        assertEquals(null, ProductService.discountedFrom(null, price));
        assertEquals(null, ProductService.discountedFrom(new BigDecimal("2000.00"), price));
        assertEquals(null, ProductService.discountedFrom(new BigDecimal("1500.00"), price));
        assertEquals(new BigDecimal("2000.01"), ProductService.discountedFrom(new BigDecimal("2000.01"), price));
    }

    @Test
    void raisingThePriceToTheOriginalPriceEndsTheDiscount() {
        ProductRepository products = mock(ProductRepository.class);
        Product ring = TestProducts.product("Moon Ring", new BigDecimal("2000.00"), 3);
        ring.setOriginalPrice(new BigDecimal("2500.00"));
        when(products.findByIdForStockUpdate(ring.getId())).thenReturn(Optional.of(ring));

        service(products, mock(ProductImageRepository.class))
                .update(ring.getId(), upsert(new BigDecimal("2500.00"), new BigDecimal("2500.00")), UUID.randomUUID());

        assertEquals(new BigDecimal("2500.00"), ring.getPrice());
        assertEquals(null, ring.getOriginalPrice());
    }

    private static ProductDtos.Upsert upsert(BigDecimal price, BigDecimal originalPrice) {
        return new ProductDtos.Upsert("Moon Ring", "moon-ring", "MR-1", "", price, originalPrice, null, null, 3, true, java.util.Set.of());
    }

    @Test
    void deletingAProductRemovesItsPhotoRecordsFirstAndHandsBackTheirFiles() {
        ProductRepository products = mock(ProductRepository.class);
        ProductImageRepository images = mock(ProductImageRepository.class);
        Product ring = TestProducts.product("Moon ring", new BigDecimal("2500.00"), 3);
        List<ProductImage> photos = List.of(
                new ProductImage(ring, ring.getId() + "/front.webp", "https://cdn.example/front.webp", "", 0),
                new ProductImage(ring, ring.getId() + "/side.webp", "https://cdn.example/side.webp", "", 1));
        when(products.findById(ring.getId())).thenReturn(Optional.of(ring));
        when(images.findByProductIdOrderByDisplayOrderAscCreatedAtAsc(ring.getId())).thenReturn(photos);

        List<String> photoPaths = service(products, images).delete(ring.getId());

        assertEquals(List.of(ring.getId() + "/front.webp", ring.getId() + "/side.webp"), photoPaths);
        InOrder order = inOrder(images, products);
        order.verify(images).deleteAll(photos);
        order.verify(products).delete(ring);
        order.verify(products).flush();
    }

    @Test
    void deletingAProductThatIsAlreadyGoneIsNotFound() {
        ProductRepository products = mock(ProductRepository.class);
        UUID missing = UUID.randomUUID();
        when(products.findById(missing)).thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service(products, mock(ProductImageRepository.class)).delete(missing));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatusCode());
        verify(products, never()).delete(any(Product.class));
    }

    private static ProductService service(ProductRepository products, ProductImageRepository images) {
        return new ProductService(products, images, mock(CategoryRepository.class), mock(StockLedger.class));
    }
}
