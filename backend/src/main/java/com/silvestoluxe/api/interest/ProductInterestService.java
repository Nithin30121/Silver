package com.silvestoluxe.api.interest;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Counts how often each piece is added to a wishlist. Wishlists themselves stay in each visitor's
 * browser; the shop only sends "one more add" for a piece, with nothing about who added it.
 */
@Service
public class ProductInterestService {
    /** The admin shows all-time adds and adds over this many days, today included. */
    static final int RECENT_DAYS = 30;

    private final JdbcTemplate jdbcTemplate;
    private final WishlistAddLimiter limiter;
    private final ZoneId zone;
    private final Clock clock;

    @Autowired
    public ProductInterestService(JdbcTemplate jdbcTemplate, WishlistAddLimiter limiter,
                                  @Value("${app.reports.time-zone:Asia/Kolkata}") String zone) {
        this(jdbcTemplate, limiter, ZoneId.of(zone), Clock.systemUTC());
    }

    ProductInterestService(JdbcTemplate jdbcTemplate, WishlistAddLimiter limiter, ZoneId zone, Clock clock) {
        this.jdbcTemplate = jdbcTemplate;
        this.limiter = limiter;
        this.zone = zone;
        this.clock = clock;
    }

    /** Counts one add for today in the shop's time zone. Hidden or unknown pieces are ignored. */
    public void recordWishlistAdd(UUID productId, String visitor) {
        LocalDate today = LocalDate.now(clock.withZone(zone));
        if (!limiter.shouldCount(visitor, productId, today)) return;
        jdbcTemplate.update("""
                insert into public.product_interest_daily (product_id, day, wishlist_adds)
                select id, ?, 1 from public.products where id = ? and is_active
                on conflict (product_id, day) do update set wishlist_adds = public.product_interest_daily.wishlist_adds + 1
                """, today, productId);
    }

    /** Pieces that have been added at least once, with all-time and recent adds. */
    public List<WishlistCount> wishlistCounts() {
        LocalDate since = LocalDate.now(clock.withZone(zone)).minusDays(RECENT_DAYS - 1L);
        return jdbcTemplate.query("""
                select product_id, sum(wishlist_adds) as all_time,
                       coalesce(sum(wishlist_adds) filter (where day >= ?), 0) as recent
                from public.product_interest_daily
                group by product_id
                """, (resultSet, row) -> new WishlistCount(resultSet.getObject("product_id", UUID.class),
                        resultSet.getLong("all_time"), resultSet.getLong("recent")), since);
    }

    /** recent covers the last RECENT_DAYS days. */
    public record WishlistCount(UUID productId, long allTime, long recent) { }
}
