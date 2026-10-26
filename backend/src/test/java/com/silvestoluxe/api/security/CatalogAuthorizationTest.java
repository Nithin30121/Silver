package com.silvestoluxe.api.security;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

class CatalogAuthorizationTest {

    @Test
    void grantsAdministrativeAccessOnlyToAnAdminProfile() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        CatalogAuthorization authorization = new CatalogAuthorization(jdbcTemplate);
        UUID userId = UUID.randomUUID();
        JwtAuthenticationToken authentication = new JwtAuthenticationToken(Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .build());

        when(jdbcTemplate.queryForObject(any(String.class), eq(Boolean.class), eq(userId))).thenReturn(true);
        assertTrue(authorization.isAdmin(authentication));

        when(jdbcTemplate.queryForObject(any(String.class), eq(Boolean.class), eq(userId))).thenReturn(false);
        assertFalse(authorization.isAdmin(authentication));
    }
}
