package com.silvestoluxe.api.contact;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

class ContactRateLimiterTest {
    private final MovableClock clock = new MovableClock(Instant.parse("2026-10-28T10:00:00Z"));
    private final ContactRateLimiter limiter = new ContactRateLimiter(clock);

    @Test
    void limitsOneSenderThenLetsThemTryAgainLater() {
        for (int sent = 0; sent < ContactRateLimiter.PER_SENDER; sent++) assertTrue(limiter.tryAcquire("one"));
        assertFalse(limiter.tryAcquire("one"));
        assertTrue(limiter.tryAcquire("someone else"));

        clock.advance(ContactRateLimiter.SENDER_WINDOW.plusSeconds(1));
        assertTrue(limiter.tryAcquire("one"));
    }

    @Test
    void capsTheWholeShopEvenWhenSendersKeepChanging() {
        for (int sent = 0; sent < ContactRateLimiter.SHOP_WIDE; sent++) assertTrue(limiter.tryAcquire("sender-" + sent));
        assertFalse(limiter.tryAcquire("a brand new sender"));

        clock.advance(ContactRateLimiter.SHOP_WINDOW.plusSeconds(1));
        assertTrue(limiter.tryAcquire("a brand new sender"));
    }

    private static final class MovableClock extends Clock {
        private Instant now;
        MovableClock(Instant now) { this.now = now; }
        void advance(Duration duration) { now = now.plus(duration); }
        @Override public Instant instant() { return now; }
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
    }
}
