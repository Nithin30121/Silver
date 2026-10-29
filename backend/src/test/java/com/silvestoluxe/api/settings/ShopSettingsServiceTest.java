package com.silvestoluxe.api.settings;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class ShopSettingsServiceTest {
    private static final Instant NOW = Instant.parse("2026-10-29T09:30:00Z");
    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final ShopSettingsService settings = new ShopSettingsService(jdbcTemplate, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void stampsANewRateWithTheTimeItWasSet() {
        settings.updateSilverRate(new SilverRateSettings.Update(new BigDecimal("195.00")));

        verify(jdbcTemplate).update(anyString(), eq(new BigDecimal("195.00")), eq(Timestamp.from(NOW)));
    }

    @Test
    void removingTheRateAlsoRemovesItsTime() {
        settings.updateSilverRate(new SilverRateSettings.Update(null));

        // Typed as Object so Mockito matches update(sql, args...) rather than update(sql, Object[], int[]).
        verify(jdbcTemplate).update(anyString(), (Object) isNull(), (Object) isNull());
    }
}
