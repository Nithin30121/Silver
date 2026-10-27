package com.silvestoluxe.api.product;

import java.math.BigDecimal;
import java.util.UUID;

import org.springframework.test.util.ReflectionTestUtils;

/** Builds catalogue products for tests in other packages; the database normally assigns the id. */
public final class TestProducts {
    private TestProducts() { }

    public static Product product(String name, BigDecimal price, int stock) {
        Product product = new Product();
        ReflectionTestUtils.setField(product, "id", UUID.randomUUID());
        product.setName(name);
        product.setSku(name.toUpperCase().replace(' ', '-'));
        product.setPrice(price);
        product.setStockQuantity(stock);
        product.setActive(true);
        return product;
    }
}
