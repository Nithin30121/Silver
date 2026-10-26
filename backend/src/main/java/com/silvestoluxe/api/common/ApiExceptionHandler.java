package com.silvestoluxe.api.common;

import java.time.Instant;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {
    record ErrorResponse(Instant timestamp, int status, String code, String message, Map<String, String> fields) { }

    private record KnownConflict(String field, String message) { }

    /** Unique rules in the catalogue schema, so a conflict names the field to change. */
    private static final Map<String, KnownConflict> KNOWN_CONFLICTS = Map.of(
            "products_slug_key", new KnownConflict("slug", "Another product already uses this URL slug. Choose a different one."),
            "products_sku_unique", new KnownConflict("sku", "Another product already uses this SKU. Choose a different one."),
            "categories_root_slug_unique", new KnownConflict("slug", "Another top-level category already uses this URL slug."),
            "categories_sibling_slug_unique", new KnownConflict("slug", "Another category under the same parent already uses this URL slug."));

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<ErrorResponse> responseStatus(ResponseStatusException exception) {
        HttpStatus status = HttpStatus.valueOf(exception.getStatusCode().value());
        return ResponseEntity.status(status).body(new ErrorResponse(Instant.now(), status.value(),
                status.name(), exception.getReason() == null ? "Request failed." : exception.getReason(), Map.of()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorResponse> invalidInput(MethodArgumentNotValidException exception) {
        Map<String, String> fields = exception.getBindingResult().getFieldErrors().stream()
                .collect(java.util.stream.Collectors.toMap(error -> error.getField(),
                        error -> error.getDefaultMessage() == null ? "Invalid value." : error.getDefaultMessage(),
                        (first, ignored) -> first));
        return ResponseEntity.badRequest().body(new ErrorResponse(Instant.now(), 400, "VALIDATION_ERROR",
                "Please correct the highlighted fields.", fields));
    }

    /** Uploads over spring.servlet.multipart.max-file-size are refused before reaching a controller. */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ErrorResponse> uploadTooLarge(MaxUploadSizeExceededException exception) {
        return ResponseEntity.status(HttpStatus.CONTENT_TOO_LARGE).body(new ErrorResponse(Instant.now(),
                HttpStatus.CONTENT_TOO_LARGE.value(), "UPLOAD_TOO_LARGE", "Images must be 5 MB or smaller.", Map.of()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ErrorResponse> conflict(DataIntegrityViolationException exception) {
        // PostgreSQL names the violated rule in quotes; the offending value itself is never echoed back.
        String detail = String.valueOf(exception.getMostSpecificCause().getMessage());
        KnownConflict known = KNOWN_CONFLICTS.entrySet().stream()
                .filter(entry -> detail.contains("\"" + entry.getKey() + "\""))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse(null);
        String message = known == null ? "This value is already in use or conflicts with existing catalogue data." : known.message();
        Map<String, String> fields = known == null ? Map.of() : Map.of(known.field(), known.message());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse(Instant.now(), 409, "CONFLICT", message, fields));
    }
}
