package com.silvestoluxe.api.interest;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class ProductInterestServiceTest {
    // 28 Oct 19:00 UTC is already 29 Oct, 00:30, in India.
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-28T19:00:00Z"), ZoneOffset.UTC);
    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final ProductInterestService interest =
            new ProductInterestService(jdbcTemplate, new WishlistAddLimiter(), ZoneId.of("Asia/Kolkata"), clock);

    @Test
    void countsTheAddOnTheShopsDayAndSkipsRepeats() {
        UUID ring = UUID.randomUUID();

        interest.recordWishlistAdd(ring, "203.0.113.7");
        interest.recordWishlistAdd(ring, "203.0.113.7");

        verify(jdbcTemplate, times(1)).update(anyString(), eq(LocalDate.of(2026, 10, 29)), eq(ring));
    }

    @Test
    void reportsTheLastThirtyDaysWithTodayIncluded() {
        interest.wishlistCounts();

        verify(jdbcTemplate).query(anyString(), any(RowMapper.class), eq(LocalDate.of(2026, 9, 30)));
    }
}
