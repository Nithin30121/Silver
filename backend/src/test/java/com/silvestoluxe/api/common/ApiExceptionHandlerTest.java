package com.silvestoluxe.api.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

class ApiExceptionHandlerTest {

    @Test
    void explainsTheImageSizeLimitWhenAnUploadIsTooLarge() {
        ResponseEntity<ApiExceptionHandler.ErrorResponse> response =
                new ApiExceptionHandler().uploadTooLarge(new MaxUploadSizeExceededException(5L * 1024 * 1024));

        assertEquals(413, response.getStatusCode().value());
        assertEquals("Images must be 5 MB or smaller.", response.getBody().message());
    }

    @Test
    void namesTheSkuWhenAnotherProductAlreadyUsesIt() {
        ResponseEntity<ApiExceptionHandler.ErrorResponse> response = new ApiExceptionHandler().conflict(violation(
                "ERROR: duplicate key value violates unique constraint \"products_sku_unique\"\n  Detail: Key (sku)=(c) already exists."));

        assertEquals(409, response.getStatusCode().value());
        assertEquals("Another product already uses this SKU. Choose a different one.", response.getBody().message());
        assertEquals(Map.of("sku", "Another product already uses this SKU. Choose a different one."), response.getBody().fields());
        assertFalse(response.getBody().message().contains("(c)"), "the clashing value is not echoed back");
    }

    @Test
    void namesTheSlugWhenAnotherProductAlreadyUsesIt() {
        ResponseEntity<ApiExceptionHandler.ErrorResponse> response = new ApiExceptionHandler().conflict(violation(
                "ERROR: duplicate key value violates unique constraint \"products_slug_key\""));

        assertEquals("Another product already uses this URL slug. Choose a different one.", response.getBody().message());
        assertEquals(Map.of("slug", "Another product already uses this URL slug. Choose a different one."), response.getBody().fields());
    }

    @Test
    void keepsTheGeneralMessageForOtherConflicts() {
        ResponseEntity<ApiExceptionHandler.ErrorResponse> response = new ApiExceptionHandler().conflict(violation(
                "ERROR: insert or update on table \"category_products\" violates foreign key constraint \"category_products_category_id_fkey\""));

        assertEquals("This value is already in use or conflicts with existing catalogue data.", response.getBody().message());
        assertEquals(Map.of(), response.getBody().fields());
    }

    private static DataIntegrityViolationException violation(String databaseMessage) {
        return new DataIntegrityViolationException("could not execute statement", new RuntimeException(databaseMessage));
    }
}
