package com.silvestoluxe.api.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.web.server.ResponseStatusException;

class ReportServiceTest {
    private static final ZoneId INDIA = ZoneId.of("Asia/Kolkata");

    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final ReportService reports = new ReportService(jdbcTemplate, INDIA, Clock.systemUTC());

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

    @Test
    void givesEveryWeekOrMonthTheRangeTouchesOneBar() {
        // Thursday 29 Oct to Tuesday 10 Nov touches three weeks, each named by its Monday.
        assertEquals(List.of(LocalDate.of(2026, 10, 26), LocalDate.of(2026, 11, 2), LocalDate.of(2026, 11, 9)),
                ReportService.buckets(LocalDate.of(2026, 10, 29), LocalDate.of(2026, 11, 10), ReportService.Interval.WEEK));

        List<LocalDate> months = ReportService.buckets(LocalDate.of(2025, 11, 15), LocalDate.of(2026, 10, 29), ReportService.Interval.MONTH);
        assertEquals(12, months.size());
        assertEquals(LocalDate.of(2025, 11, 1), months.get(0));
        assertEquals(LocalDate.of(2026, 10, 1), months.get(11));

        assertEquals(List.of(LocalDate.of(2026, 10, 29)),
                ReportService.buckets(LocalDate.of(2026, 10, 29), LocalDate.of(2026, 10, 29), ReportService.Interval.DAY));
    }

    @Test
    void refusesRangesItCannotChartBeforeQuerying() {
        assertRefused(LocalDate.of(2026, 10, 29), LocalDate.of(2026, 10, 1), ReportService.Interval.DAY, "on or before the end date");
        assertRefused(LocalDate.of(2023, 1, 1), LocalDate.of(2026, 10, 29), ReportService.Interval.MONTH, "three years or less");
        assertRefused(LocalDate.of(2025, 1, 1), LocalDate.of(2026, 10, 29), ReportService.Interval.DAY, "too many days");
        assertRefused(null, LocalDate.of(2026, 10, 29), ReportService.Interval.DAY, "start date");
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void showsDaysWithoutOrdersAsZeroAndComparesWithTheSameLengthBefore() {
        // 1 to 30 Oct is 30 days, so the comparison is 1 to 30 Sept, counted from midnight in India.
        when(jdbcTemplate.queryForObject(anyString(), any(RowMapper.class),
                eq(Timestamp.from(Instant.parse("2026-08-31T18:30:00Z"))), eq(Timestamp.from(Instant.parse("2026-09-30T18:30:00Z")))))
                .thenReturn(new ReportService.Totals(4, new BigDecimal("8000.00")));

        ReportService.SalesSeries series = reports.sales(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 30), ReportService.Interval.DAY);

        assertEquals(30, series.points().size());
        assertEquals(LocalDate.of(2026, 10, 1), series.points().get(0).start());
        assertTrue(series.points().stream().allMatch(point -> point.orderCount() == 0 && point.orderValue().signum() == 0));
        assertEquals(new ReportService.Totals(0, BigDecimal.ZERO), series.total());
        assertEquals(new ReportService.Totals(4, new BigDecimal("8000.00")), series.previous());
        assertEquals("Asia/Kolkata", series.timeZone());
    }

    @Test
    void refusesBadRangesForTheBreakdownsToo() {
        ResponseStatusException reversed = assertThrows(ResponseStatusException.class,
                () -> reports.salesByCategory(LocalDate.of(2026, 10, 29), LocalDate.of(2026, 10, 1)));
        assertEquals(HttpStatus.BAD_REQUEST, reversed.getStatusCode());
        assertThrows(ResponseStatusException.class, () -> reports.salesByPaymentMethod(null, LocalDate.of(2026, 10, 29)));
        assertThrows(ResponseStatusException.class,
                () -> reports.customerGrowth(LocalDate.of(2025, 1, 1), LocalDate.of(2026, 10, 29), ReportService.Interval.DAY));
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void countsNewCustomersPerDayAndComparesWithTheSameLengthBefore() {
        // 1 to 30 Oct is 30 days, so the comparison is 1 to 30 Sept, counted from midnight in India.
        when(jdbcTemplate.queryForObject(anyString(), eq(Long.class),
                eq(Timestamp.from(Instant.parse("2026-08-31T18:30:00Z"))), eq(Timestamp.from(Instant.parse("2026-09-30T18:30:00Z")))))
                .thenReturn(3L);
        when(jdbcTemplate.queryForObject(anyString(), eq(Long.class))).thenReturn(10L);

        ReportService.CustomerGrowth growth = reports.customerGrowth(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 30), ReportService.Interval.DAY);

        assertEquals(30, growth.points().size());
        assertTrue(growth.points().stream().allMatch(point -> point.newCustomers() == 0));
        assertEquals(0, growth.total());
        assertEquals(3, growth.previous());
        assertEquals(10, growth.allCustomers());
    }

    private void assertRefused(LocalDate from, LocalDate to, ReportService.Interval interval, String message) {
        ResponseStatusException refused = assertThrows(ResponseStatusException.class, () -> reports.sales(from, to, interval));
        assertEquals(HttpStatus.BAD_REQUEST, refused.getStatusCode());
        assertTrue(refused.getReason().contains(message), refused.getReason());
    }
}
