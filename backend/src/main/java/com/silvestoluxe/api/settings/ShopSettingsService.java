package com.silvestoluxe.api.settings;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Reads and saves the owner's silver rate (the single shop_settings row). */
@Service
public class ShopSettingsService {
    private final JdbcTemplate jdbcTemplate;
    private final Clock clock;

    @Autowired
    public ShopSettingsService(JdbcTemplate jdbcTemplate) {
        this(jdbcTemplate, Clock.systemUTC());
    }

    ShopSettingsService(JdbcTemplate jdbcTemplate, Clock clock) {
        this.jdbcTemplate = jdbcTemplate;
        this.clock = clock;
    }

    public SilverRateSettings silverRate() {
        return jdbcTemplate.query("select silver_rate_per_gram, silver_rate_set_at from public.shop_settings where id = 1",
                        (resultSet, row) -> {
                            Timestamp setAt = resultSet.getTimestamp("silver_rate_set_at");
                            return new SilverRateSettings(resultSet.getBigDecimal("silver_rate_per_gram"), setAt == null ? null : setAt.toInstant());
                        })
                .stream().findFirst().orElse(new SilverRateSettings(null, null));
    }

    /** Saving a rate stamps it with the current time, even when it's the same rate, so customers see it's current. */
    @Transactional
    public SilverRateSettings updateSilverRate(SilverRateSettings.Update update) {
        Instant setAt = update.ratePerGram() == null ? null : clock.instant();
        jdbcTemplate.update("""
                insert into public.shop_settings (id, silver_rate_per_gram, silver_rate_set_at, updated_at)
                values (1, ?, ?, now())
                on conflict (id) do update set silver_rate_per_gram = excluded.silver_rate_per_gram,
                    silver_rate_set_at = excluded.silver_rate_set_at, updated_at = now()
                """, update.ratePerGram(), setAt == null ? null : Timestamp.from(setAt));
        return silverRate();
    }
}
