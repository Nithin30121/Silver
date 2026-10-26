package com.silvestoluxe.api.account;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Reads the authenticated user's application profile; credentials stay in Supabase Auth. */
@Service
public class AccountProfileService {

    private final JdbcTemplate jdbcTemplate;

    public AccountProfileService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public CurrentUser currentUser(String subject) {
        final UUID userId;
        try {
            userId = UUID.fromString(subject);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid access token subject.");
        }

        List<CurrentUser> users = jdbcTemplate.query("""
                select id, full_name, email, role, created_at, updated_at
                from public.profiles
                where id = ?
                """, (resultSet, rowNumber) -> new CurrentUser(
                        resultSet.getObject("id", UUID.class),
                        resultSet.getString("full_name"),
                        resultSet.getString("email"),
                        resultSet.getString("role"),
                        resultSet.getTimestamp("created_at").toInstant(),
                        resultSet.getTimestamp("updated_at").toInstant()), userId);

        return users.stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "No profile exists for this account. Please sign in again."));
    }

    public record CurrentUser(UUID id, String fullName, String email, String role,
                              Instant createdAt, Instant updatedAt) { }
}
