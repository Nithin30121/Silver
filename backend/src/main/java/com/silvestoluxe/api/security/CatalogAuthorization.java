package com.silvestoluxe.api.security;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/** Server-side role check. A browser cannot promote itself because profiles.role is database protected. */
@Component("catalogAuthorization")
public class CatalogAuthorization {
    private final JdbcTemplate jdbcTemplate;

    public CatalogAuthorization(JdbcTemplate jdbcTemplate) { this.jdbcTemplate = jdbcTemplate; }

    public boolean isAdmin(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) return false;
        try {
            UUID userId = UUID.fromString(jwt.getSubject());
            Boolean isAdmin = jdbcTemplate.queryForObject(
                    "select exists (select 1 from public.profiles where id = ? and role = 'admin')",
                    Boolean.class, userId);
            return Boolean.TRUE.equals(isAdmin);
        } catch (IllegalArgumentException ignored) {
            return false;
        }
    }
}
