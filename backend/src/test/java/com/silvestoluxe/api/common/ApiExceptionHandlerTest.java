package com.silvestoluxe.api.common;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
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
}
