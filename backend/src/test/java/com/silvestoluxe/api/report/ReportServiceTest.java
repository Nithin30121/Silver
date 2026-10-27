package com.silvestoluxe.api.report;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;

import org.junit.jupiter.api.Test;

class ReportServiceTest {
    private static final ZoneId INDIA = ZoneId.of("Asia/Kolkata");

    @Test
    void startsTheWeekOnMondayInTheShopsTimeZone() {
        // Sunday 1 Nov 2026, 01:00 in India is still Saturday evening in UTC.
        ZonedDateTime now = ZonedDateTime.of(2026, 11, 1, 1, 0, 0, 0, INDIA);

        assertEquals(Instant.parse("2026-10-25T18:30:00Z"), ReportService.weekStart(now));
        assertEquals(Instant.parse("2026-10-31T18:30:00Z"), ReportService.monthStart(now));
    }

    @Test
    void aMondayIsItsOwnWeekStart() {
        ZonedDateTime now = ZonedDateTime.of(2026, 10, 26, 0, 0, 0, 0, INDIA);

        assertEquals(now.toInstant(), ReportService.weekStart(now));
    }
}
