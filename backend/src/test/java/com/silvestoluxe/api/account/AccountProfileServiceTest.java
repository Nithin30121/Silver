package com.silvestoluxe.api.account;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

class AccountProfileServiceTest {

    @Test
    void rejectsAnAccessTokenWhoseSubjectIsNotAUuid() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        AccountProfileService service = new AccountProfileService(jdbcTemplate);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.currentUser("not-a-user-id"));

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }
}
