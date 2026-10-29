package com.silvestoluxe.api.account;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.Map;

import com.silvestoluxe.api.order.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Lets a customer delete their own account. Their sign-in, profile and saved addresses are removed;
 * past orders stay for the shop's records with their own delivery snapshot, no longer linked to anyone.
 */
@Service
public class AccountDeletionService {
    /** Deleting needs a password typed in the last few minutes, not just any open session. */
    static final Duration RECENT_SIGN_IN = Duration.ofMinutes(10);

    private final AccountProfileService profiles;
    private final OrderService orders;
    private final SupabaseAuthAdminClient auth;
    private final Clock clock;

    @Autowired
    public AccountDeletionService(AccountProfileService profiles, OrderService orders, SupabaseAuthAdminClient auth) {
        this(profiles, orders, auth, Clock.systemUTC());
    }

    AccountDeletionService(AccountProfileService profiles, OrderService orders, SupabaseAuthAdminClient auth, Clock clock) {
        this.profiles = profiles;
        this.orders = orders;
        this.auth = auth;
        this.clock = clock;
    }

    public void delete(Jwt jwt) {
        Instant signedInAt = lastSignIn(jwt);
        if (signedInAt == null || signedInAt.isBefore(clock.instant().minus(RECENT_SIGN_IN))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "For your security, please enter your password again before deleting your account.");
        }
        AccountProfileService.CurrentUser user = profiles.currentUser(jwt.getSubject());
        if ("admin".equals(user.role())) {
            // Keeps the shop from losing its only admin by accident.
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Admin accounts can't be deleted from the shop. Remove the admin role first.");
        }
        if (orders.hasOrdersInProgress(user.id())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "You have an order that is still in progress. You can delete your account once it has been delivered or cancelled.");
        }
        auth.deleteUser(user.id());
    }

    /**
     * When the customer last entered their password. Supabase records each sign-in in the token's
     * "amr" claim as {method, timestamp}; a refreshed token keeps the original sign-in time.
     */
    static Instant lastSignIn(Jwt jwt) {
        if (!(jwt.getClaims().get("amr") instanceof Collection<?> methods)) return null;
        Instant latest = null;
        for (Object method : methods) {
            if (method instanceof Map<?, ?> entry && entry.get("timestamp") instanceof Number seconds) {
                Instant at = Instant.ofEpochSecond(seconds.longValue());
                if (latest == null || at.isAfter(latest)) latest = at;
            }
        }
        return latest;
    }
}
