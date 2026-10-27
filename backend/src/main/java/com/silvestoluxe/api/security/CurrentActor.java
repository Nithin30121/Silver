package com.silvestoluxe.api.security;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;

/** The profile id behind a validated Supabase access token, recorded with changes an admin makes. */
public final class CurrentActor {
    private CurrentActor() { }

    public static UUID idOf(Jwt jwt) {
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid access token subject.");
        }
    }
}
