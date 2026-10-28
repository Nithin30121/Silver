package com.silvestoluxe.api.report;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Sales figures for the admin overview. Order value leaves out cancelled orders and is not money
 * received: there is no payment provider yet, so "paid" only reflects what an admin has marked.
 */
@Service
public class ReportService {
    static final int BEST_SELLER_LIMIT = 5;
    /** A chart has at most this many bars; longer ranges need a wider interval. */
    static final int MAX_POINTS = 400;
    /** The longest range a chart may cover. */
    static final long MAX_DAYS = 3 * 366;

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

    /**
     * Order value per day, week or month from one date to another (both included, in the shop's time
     * zone), with days that had no orders shown as zero, and the same-length period just before for
     * comparison. Cancelled orders are left out, as in the summary.
     */
    public SalesSeries sales(LocalDate from, LocalDate to, Interval interval) {
        if (from == null || to == null || interval == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a start date, an end date and an interval.");
        }
        if (to.isBefore(from)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The start date must be on or before the end date.");
        long days = ChronoUnit.DAYS.between(from, to) + 1;
        if (days > MAX_DAYS) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a range of three years or less.");
        List<LocalDate> buckets = buckets(from, to, interval);
        if (buckets.size() > MAX_POINTS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "That range has too many " + interval.label + "s to chart. Choose a wider interval.");
        }

        Map<LocalDate, SalesPoint> found = new HashMap<>();
        jdbcTemplate.query("""
                select date_trunc(?, created_at at time zone ?)::date as bucket,
                       count(*) as order_count,
                       coalesce(sum(total_amount), 0) as order_value
                from public.orders
                where status <> 'CANCELLED' and created_at >= ? and created_at < ?
                group by 1
                """, (RowCallbackHandler) resultSet -> {
                    LocalDate bucket = resultSet.getObject("bucket", LocalDate.class);
                    found.put(bucket, new SalesPoint(bucket, resultSet.getLong("order_count"), resultSet.getBigDecimal("order_value")));
                }, interval.sqlUnit, zone.getId(), start(from), start(to.plusDays(1)));

        List<SalesPoint> points = buckets.stream()
                .map((bucket) -> found.getOrDefault(bucket, new SalesPoint(bucket, 0, BigDecimal.ZERO)))
                .toList();
        long orders = points.stream().mapToLong(SalesPoint::orderCount).sum();
        BigDecimal value = points.stream().map(SalesPoint::orderValue).reduce(BigDecimal.ZERO, BigDecimal::add);
        LocalDate previousTo = from.minusDays(1);
        return new SalesSeries(zone.getId(), from, to, interval, points, new Totals(orders, value),
                totals(previousTo.minusDays(days - 1), previousTo));
    }

    /** The start of every day, week (from Monday) or month that the range touches. */
    static List<LocalDate> buckets(LocalDate from, LocalDate to, Interval interval) {
        List<LocalDate> buckets = new ArrayList<>();
        for (LocalDate bucket = interval.startOf(from); !bucket.isAfter(to); bucket = interval.next(bucket)) {
            buckets.add(bucket);
            if (buckets.size() > MAX_POINTS) break;
        }
        return buckets;
    }

    private Totals totals(LocalDate from, LocalDate to) {
        return jdbcTemplate.queryForObject("""
                select count(*) as order_count, coalesce(sum(total_amount), 0) as order_value
                from public.orders
                where status <> 'CANCELLED' and created_at >= ? and created_at < ?
                """, (resultSet, rowNumber) -> new Totals(resultSet.getLong("order_count"), resultSet.getBigDecimal("order_value")),
                start(from), start(to.plusDays(1)));
    }

    private Timestamp start(LocalDate day) { return Timestamp.from(day.atStartOfDay(zone).toInstant()); }

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

    public enum Interval {
        DAY("day", "day"), WEEK("week", "week"), MONTH("month", "month");

        final String sqlUnit;
        final String label;

        Interval(String sqlUnit, String label) {
            this.sqlUnit = sqlUnit;
            this.label = label;
        }

        LocalDate startOf(LocalDate day) {
            return switch (this) {
                case DAY -> day;
                case WEEK -> day.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                case MONTH -> day.withDayOfMonth(1);
            };
        }

        LocalDate next(LocalDate bucket) {
            return switch (this) {
                case DAY -> bucket.plusDays(1);
                case WEEK -> bucket.plusWeeks(1);
                case MONTH -> bucket.plusMonths(1);
            };
        }
    }

    /** One bar of the chart: the day, week (its Monday) or month (its 1st) it covers. */
    public record SalesPoint(LocalDate start, long orderCount, BigDecimal orderValue) { }

    public record Totals(long orderCount, BigDecimal orderValue) { }

    public record SalesSeries(String timeZone, LocalDate from, LocalDate to, Interval interval, List<SalesPoint> points,
                              Totals total, Totals previous) { }

    /** from is null for all time. */
    public record Period(Instant from, long orderCount, BigDecimal orderValue, BigDecimal paidValue) { }

    public record BestSeller(UUID productId, String name, String sku, long quantity, BigDecimal orderValue) { }

    /** ordersByStatus counts every order, cancelled ones included. */
    public record Summary(String timeZone, Period thisWeek, Period thisMonth, Period allTime,
                          Map<String, Long> ordersByStatus, List<BestSeller> bestSellers) { }
}
