package com.silvestoluxe.api.account;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.silvestoluxe.api.order.OrderService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;

class AccountDeletionServiceTest {
    private static final Instant NOW = Instant.parse("2026-10-28T10:00:00Z");

    private final AccountProfileService profiles = mock(AccountProfileService.class);
    private final OrderService orders = mock(OrderService.class);
    private final SupabaseAuthAdminClient auth = mock(SupabaseAuthAdminClient.class);
    private final AccountDeletionService service = new AccountDeletionService(profiles, orders, auth, Clock.fixed(NOW, ZoneOffset.UTC));

    private final UUID customerId = UUID.randomUUID();

    @Test
    void deletesACustomerWhoJustEnteredTheirPassword() {
        profile("customer");

        service.delete(token(NOW.minusSeconds(60)));

        verify(auth).deleteUser(customerId);
    }

    @Test
    void needsAFreshPassword() {
        profile("customer");

        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> service.delete(token(NOW.minus(AccountDeletionService.RECENT_SIGN_IN).minusSeconds(1)))).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> service.delete(Jwt.withTokenValue("token").header("alg", "ES256").subject(customerId.toString()).build())).getStatusCode());
        verify(auth, never()).deleteUser(any());
    }

    @Test
    void keepsAdminAccounts() {
        profile("admin");

        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class, () -> service.delete(token(NOW))).getStatusCode());
        verify(auth, never()).deleteUser(any());
    }

    @Test
    void waitsForOrdersThatAreStillOnTheirWay() {
        profile("customer");
        when(orders.hasOrdersInProgress(customerId)).thenReturn(true);

        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class, () -> service.delete(token(NOW))).getStatusCode());
        verify(auth, never()).deleteUser(any());
    }

    @Test
    void readsTheLatestSignInFromTheToken() {
        Jwt twoSignIns = Jwt.withTokenValue("token").header("alg", "ES256").subject(customerId.toString())
                .claim("amr", List.of(Map.of("method", "password", "timestamp", NOW.minusSeconds(900).getEpochSecond()),
                        Map.of("method", "otp", "timestamp", NOW.minusSeconds(5).getEpochSecond()), "unexpected"))
                .build();

        assertEquals(NOW.minusSeconds(5), AccountDeletionService.lastSignIn(twoSignIns));
        assertNull(AccountDeletionService.lastSignIn(Jwt.withTokenValue("token").header("alg", "ES256").claim("amr", "password").build()));
    }

    private void profile(String role) {
        when(profiles.currentUser(customerId.toString())).thenReturn(new AccountProfileService.CurrentUser(
                customerId, "Asha Rao", "asha@example.com", role, NOW, NOW));
    }

    private Jwt token(Instant signedInAt) {
        return Jwt.withTokenValue("token").header("alg", "ES256").subject(customerId.toString())
                .claim("amr", List.of(Map.of("method", "password", "timestamp", signedInAt.getEpochSecond())))
                .build();
    }
}
