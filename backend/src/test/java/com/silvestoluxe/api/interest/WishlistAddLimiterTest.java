package com.silvestoluxe.api.interest;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.Test;

class WishlistAddLimiterTest {
    private final WishlistAddLimiter limiter = new WishlistAddLimiter();
    private final LocalDate today = LocalDate.of(2026, 10, 29);
    private final UUID ring = UUID.randomUUID();
    private final UUID chain = UUID.randomUUID();

    @Test
    void countsEachVisitorOncePerPiecePerDay() {
        assertTrue(limiter.shouldCount("203.0.113.7", ring, today));
        assertFalse(limiter.shouldCount("203.0.113.7", ring, today));
        assertTrue(limiter.shouldCount("203.0.113.7", chain, today));
        assertTrue(limiter.shouldCount("198.51.100.4", ring, today));
        assertTrue(limiter.shouldCount("203.0.113.7", ring, today.plusDays(1)));
    }

    @Test
    void capsHowManyPiecesOneVisitorCountsForInADay() {
        for (int piece = 0; piece < WishlistAddLimiter.PER_VISITOR_PER_DAY; piece++) {
            assertTrue(limiter.shouldCount("203.0.113.7", UUID.randomUUID(), today));
        }
        assertFalse(limiter.shouldCount("203.0.113.7", UUID.randomUUID(), today));
        assertTrue(limiter.shouldCount("198.51.100.4", UUID.randomUUID(), today));
    }
}
