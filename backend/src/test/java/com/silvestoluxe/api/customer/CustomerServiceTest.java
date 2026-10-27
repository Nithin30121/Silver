package com.silvestoluxe.api.customer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

class CustomerServiceTest {
    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final CustomerService service = new CustomerService(jdbcTemplate);

    @Test
    void rejectsUnknownRolesBeforeQuerying() {
        assertBadRequest(() -> service.list("", "owner", 0, 25));
    }

    @Test
    void rejectsPagesOutsideTheAllowedRange() {
        assertBadRequest(() -> service.list("", null, -1, 25));
        assertBadRequest(() -> service.list("", null, 0, 0));
        assertBadRequest(() -> service.list("", null, 0, CustomerService.MAX_PAGE_SIZE + 1));
    }

    @Test
    void rejectsOverlongSearches() {
        assertBadRequest(() -> service.list("a".repeat(CustomerService.MAX_QUERY_LENGTH + 1), null, 0, 25));
    }

    private void assertBadRequest(Runnable call) {
        ResponseStatusException exception = assertThrows(ResponseStatusException.class, call::run);
        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }
}
