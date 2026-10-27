package com.silvestoluxe.api.report;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Service;

/**
 * Sales figures for the admin overview. Order value leaves out cancelled orders and is not money
 * received: there is no payment provider yet, so "paid" only reflects what an admin has marked.
 */
@Service
public class ReportService {
    static final int BEST_SELLER_LIMIT = 5;

    private final JdbcTemplate jdbcTemplate;
    private final ZoneId zone;
    private final Clock clock;

    @Autowired
    public ReportService(JdbcTemplate jdbcTemplate, @Value("${app.reports.time-zone:Asia/Kolkata}") String zone) {
        this(jdbcTemplate, ZoneId.of(zone), Clock.systemUTC());
    }

    ReportService(JdbcTemplate jdbcTemplate, ZoneId zone, Clock clock) {
        this.jdbcTemplate = jdbcTemplate;
        this.zone = zone;
        this.clock = clock;
    }

    public ZoneId zone() { return zone; }

    public Summary summary() {
        ZonedDateTime now = ZonedDateTime.now(clock.withZone(zone));
        Instant weekStart = weekStart(now);
        Instant monthStart = monthStart(now);

        Map<String, Long> byStatus = new LinkedHashMap<>();
        jdbcTemplate.query("select status, count(*) as order_count from public.orders group by status order by status",
                (RowCallbackHandler) resultSet -> byStatus.put(resultSet.getString("status"), resultSet.getLong("order_count")));

        List<BestSeller> bestSellers = jdbcTemplate.query("""
                select (array_agg(i.product_id))[1] as product_id,
                       coalesce(max(p.name), max(i.product_name)) as product_name,
                       coalesce(max(p.sku), max(i.product_sku)) as product_sku,
                       sum(i.quantity) as quantity,
                       sum(i.line_total) as order_value
                from public.order_items i
                join public.orders o on o.id = i.order_id
                left join public.products p on p.id = i.product_id
                where o.status <> 'CANCELLED'
                group by coalesce(i.product_id::text, i.product_name)
                order by quantity desc, order_value desc
                limit ?
                """, (resultSet, rowNumber) -> new BestSeller(
                        resultSet.getObject("product_id", UUID.class),
                        resultSet.getString("product_name"),
                        resultSet.getString("product_sku"),
                        resultSet.getLong("quantity"),
                        resultSet.getBigDecimal("order_value")), BEST_SELLER_LIMIT);

        return new Summary(zone.getId(), period(weekStart), period(monthStart), period(null), byStatus, bestSellers);
    }

    /** Monday 00:00 in the shop's time zone. */
    static Instant weekStart(ZonedDateTime now) {
        return now.toLocalDate().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).atStartOfDay(now.getZone()).toInstant();
    }

    /** The 1st of the month, 00:00 in the shop's time zone. */
    static Instant monthStart(ZonedDateTime now) {
        return now.toLocalDate().withDayOfMonth(1).atStartOfDay(now.getZone()).toInstant();
    }

    private Period period(Instant from) {
        String where = "where status <> 'CANCELLED'" + (from == null ? "" : " and created_at >= ?");
        Object[] arguments = from == null ? new Object[0] : new Object[] { Timestamp.from(from) };
        return jdbcTemplate.queryForObject("""
                select count(*) as order_count,
                       coalesce(sum(total_amount), 0) as order_value,
                       coalesce(sum(total_amount) filter (where payment_status = 'PAID'), 0) as paid_value
                from public.orders
                """ + where, (resultSet, rowNumber) -> new Period(from, resultSet.getLong("order_count"),
                        resultSet.getBigDecimal("order_value"), resultSet.getBigDecimal("paid_value")), arguments);
    }

    /** from is null for all time. */
    public record Period(Instant from, long orderCount, BigDecimal orderValue, BigDecimal paidValue) { }

    public record BestSeller(UUID productId, String name, String sku, long quantity, BigDecimal orderValue) { }

    /** ordersByStatus counts every order, cancelled ones included. */
    public record Summary(String timeZone, Period thisWeek, Period thisMonth, Period allTime,
                          Map<String, Long> ordersByStatus, List<BestSeller> bestSellers) { }
}
