package com.silvestoluxe.api.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class PlacedBetweenTest {
    private static final ZoneId INDIA = ZoneId.of("Asia/Kolkata");

    @Test
    void countsWholeDaysInTheShopsTimeZone() {
        // 1 to 29 October in India is 30 Sept 18:30 UTC up to, not including, 29 Oct 18:30 UTC.
        assertEquals(new PlacedBetween(Instant.parse("2026-09-30T18:30:00Z"), Instant.parse("2026-10-29T18:30:00Z")),
                PlacedBetween.days(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 29), INDIA));
        assertEquals(new PlacedBetween(Instant.parse("2026-10-28T18:30:00Z"), Instant.parse("2026-10-29T18:30:00Z")),
                PlacedBetween.days(LocalDate.of(2026, 10, 29), LocalDate.of(2026, 10, 29), INDIA));
    }

    @Test
    void leavesAMissingEndOpen() {
        assertEquals(PlacedBetween.ANY, PlacedBetween.days(null, null, INDIA));
        assertEquals(new PlacedBetween(Instant.parse("2026-09-30T18:30:00Z"), null), PlacedBetween.days(LocalDate.of(2026, 10, 1), null, INDIA));
        assertEquals(new PlacedBetween(null, Instant.parse("2026-10-29T18:30:00Z")), PlacedBetween.days(null, LocalDate.of(2026, 10, 29), INDIA));
    }

    @Test
    void refusesAnEndBeforeTheStart() {
        ResponseStatusException refused = assertThrows(ResponseStatusException.class,
                () -> PlacedBetween.days(LocalDate.of(2026, 10, 29), LocalDate.of(2026, 10, 1), INDIA));
        assertEquals(HttpStatus.BAD_REQUEST, refused.getStatusCode());
    }
}
