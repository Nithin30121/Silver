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
        long days = checkRange(from, to);
        List<LocalDate> buckets = chartBuckets(from, to, interval);

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

    /**
     * Order value, pieces and orders per category from one day to another, leaving out cancelled
     * orders. A piece placed in two categories counts in both; pieces in no category, or whose
     * product was deleted, are listed under a null category.
     */
    public CategoryBreakdown salesByCategory(LocalDate from, LocalDate to) {
        checkRange(from, to);
        List<CategorySales> categories = jdbcTemplate.query("""
                select cp.category_id, count(distinct o.id) as order_count, sum(i.quantity) as pieces, sum(i.line_total) as order_value
                from public.order_items i
                join public.orders o on o.id = i.order_id
                left join public.category_products cp on cp.product_id = i.product_id
                where o.status <> 'CANCELLED' and o.created_at >= ? and o.created_at < ?
                group by cp.category_id
                order by order_value desc
                """, (resultSet, row) -> new CategorySales(resultSet.getObject("category_id", UUID.class), resultSet.getLong("order_count"),
                        resultSet.getLong("pieces"), resultSet.getBigDecimal("order_value")), start(from), start(to.plusDays(1)));
        return new CategoryBreakdown(zone.getId(), from, to, categories, totals(from, to));
    }

    /**
     * Orders and order value per payment method chosen at checkout, leaving out cancelled orders.
     * There is no payment provider yet, so paidValue is only what an admin has marked as paid.
     */
    public PaymentBreakdown salesByPaymentMethod(LocalDate from, LocalDate to) {
        checkRange(from, to);
        List<PaymentMethodSales> methods = jdbcTemplate.query("""
                select payment_method, count(*) as order_count, coalesce(sum(total_amount), 0) as order_value,
                       coalesce(sum(total_amount) filter (where payment_status = 'PAID'), 0) as paid_value
                from public.orders
                where status <> 'CANCELLED' and created_at >= ? and created_at < ?
                group by payment_method
                order by order_value desc
                """, (resultSet, row) -> new PaymentMethodSales(resultSet.getString("payment_method"), resultSet.getLong("order_count"),
                        resultSet.getBigDecimal("order_value"), resultSet.getBigDecimal("paid_value")), start(from), start(to.plusDays(1)));
        return new PaymentBreakdown(zone.getId(), from, to, methods);
    }

    /**
     * New customer accounts (admins left out) per day, week or month, with empty ones as zero, the
     * same-length period just before for comparison, and how many customers there are in all.
     */
    public CustomerGrowth customerGrowth(LocalDate from, LocalDate to, Interval interval) {
        long days = checkRange(from, to);
        List<LocalDate> buckets = chartBuckets(from, to, interval);
        Map<LocalDate, Long> found = new HashMap<>();
        jdbcTemplate.query("""
                select date_trunc(?, created_at at time zone ?)::date as bucket, count(*) as new_customers
                from public.profiles
                where role = 'customer' and created_at >= ? and created_at < ?
                group by 1
                """, (RowCallbackHandler) resultSet -> found.put(resultSet.getObject("bucket", LocalDate.class), resultSet.getLong("new_customers")),
                interval.sqlUnit, zone.getId(), start(from), start(to.plusDays(1)));
        List<GrowthPoint> points = buckets.stream().map((bucket) -> new GrowthPoint(bucket, found.getOrDefault(bucket, 0L))).toList();
        LocalDate previousTo = from.minusDays(1);
        return new CustomerGrowth(zone.getId(), from, to, interval, points, points.stream().mapToLong(GrowthPoint::newCustomers).sum(),
                newCustomers(previousTo.minusDays(days - 1), previousTo), newCustomers(null, null));
    }

    /** The number of days in the range, after checking it is one a report can cover. */
    private static long checkRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a start date and an end date.");
        if (to.isBefore(from)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The start date must be on or before the end date.");
        long days = ChronoUnit.DAYS.between(from, to) + 1;
        if (days > MAX_DAYS) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a range of three years or less.");
        return days;
    }

    private static List<LocalDate> chartBuckets(LocalDate from, LocalDate to, Interval interval) {
        if (interval == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose daily, weekly or monthly.");
        List<LocalDate> buckets = buckets(from, to, interval);
        if (buckets.size() > MAX_POINTS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "That range has too many " + interval.label + "s to chart. Choose a wider interval.");
        }
        return buckets;
    }

    /** New customer accounts in the range, or all of them when both ends are null. */
    private long newCustomers(LocalDate from, LocalDate to) {
        String customers = "select count(*) from public.profiles where role = 'customer'";
        Long count = from == null ? jdbcTemplate.queryForObject(customers, Long.class)
                : jdbcTemplate.queryForObject(customers + " and created_at >= ? and created_at < ?", Long.class, start(from), start(to.plusDays(1)));
        return count == null ? 0 : count;
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

    /** categoryId is null for pieces in no category. */
    public record CategorySales(UUID categoryId, long orderCount, long pieces, BigDecimal orderValue) { }

    /** total counts each order once, however many categories its pieces are in. */
    public record CategoryBreakdown(String timeZone, LocalDate from, LocalDate to, List<CategorySales> categories, Totals total) { }

    /** method is UPI, CARD or COD, as chosen at checkout. */
    public record PaymentMethodSales(String method, long orderCount, BigDecimal orderValue, BigDecimal paidValue) { }

    public record PaymentBreakdown(String timeZone, LocalDate from, LocalDate to, List<PaymentMethodSales> methods) { }

    /** One bar of the customer growth chart: the day, week (its Monday) or month (its 1st) it covers. */
    public record GrowthPoint(LocalDate start, long newCustomers) { }

    /** total is the new customers in the range, previous those in the same-length period before. */
    public record CustomerGrowth(String timeZone, LocalDate from, LocalDate to, Interval interval, List<GrowthPoint> points,
                                 long total, long previous, long allCustomers) { }

    /** from is null for all time. */
    public record Period(Instant from, long orderCount, BigDecimal orderValue, BigDecimal paidValue) { }

    public record BestSeller(UUID productId, String name, String sku, long quantity, BigDecimal orderValue) { }

    /** ordersByStatus counts every order, cancelled ones included. */
    public record Summary(String timeZone, Period thisWeek, Period thisMonth, Period allTime,
                          Map<String, Long> ordersByStatus, List<BestSeller> bestSellers) { }
}
