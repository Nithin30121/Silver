package com.silvestoluxe.api.customer;

import static com.silvestoluxe.api.customer.CustomerDtos.Summary;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.silvestoluxe.api.common.LikePattern;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Read-only customer directory for administrators: profiles plus a summary of their orders. */
@Service
public class CustomerService {
    static final int MAX_PAGE_SIZE = 100;
    static final int MAX_QUERY_LENGTH = 100;
    static final int EXPORT_LIMIT = 10_000;
    private static final Set<String> ROLES = Set.of("customer", "admin");

    // Grouping by the primary key lets PostgreSQL return the other profile columns alongside the totals.
    private static final String SUMMARY = """
            select p.id, p.full_name, p.email, p.role, p.created_at,
                   count(o.id) as order_count,
                   coalesce(sum(o.total_amount) filter (where o.status <> 'CANCELLED'), 0) as order_value,
                   max(o.created_at) as last_order_at
            from public.profiles p
            left join public.orders o on o.customer_id = p.id
            """;

    private final JdbcTemplate jdbcTemplate;

    public CustomerService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Newest accounts first. The query matches part of a name or email, ignoring case. */
    public Page<Summary> list(String query, String role, int page, int size) {
        if (page < 0) throw badRequest("Page must not be negative.");
        if (size < 1 || size > MAX_PAGE_SIZE) throw badRequest("Page size must be between 1 and " + MAX_PAGE_SIZE + ".");
        Filter filter = filter(query, role);

        Long total = jdbcTemplate.queryForObject("select count(*) from public.profiles p\n" + filter.where(), Long.class,
                filter.arguments().toArray());
        List<Object> pageArguments = new ArrayList<>(filter.arguments());
        pageArguments.add(size);
        pageArguments.add((long) page * size);
        List<Summary> customers = jdbcTemplate.query(SUMMARY + filter.where()
                + "group by p.id\norder by p.created_at desc, p.id\nlimit ? offset ?", this::summary, pageArguments.toArray());
        return new PageImpl<>(customers, PageRequest.of(page, size), total == null ? 0 : total);
    }

    /** Every matching account, newest first, for spreadsheet downloads. */
    public List<Summary> export(String query, String role) {
        Filter filter = filter(query, role);
        List<Object> arguments = new ArrayList<>(filter.arguments());
        arguments.add(EXPORT_LIMIT);
        return jdbcTemplate.query(SUMMARY + filter.where()
                + "group by p.id\norder by p.created_at desc, p.id\nlimit ?", this::summary, arguments.toArray());
    }

    public Summary find(UUID id) {
        return jdbcTemplate.query(SUMMARY + "where p.id = ?\ngroup by p.id", this::summary, id).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found."));
    }

    private record Filter(String where, List<Object> arguments) { }

    private Filter filter(String query, String role) {
        String search = query == null ? "" : query.trim();
        if (search.length() > MAX_QUERY_LENGTH) throw badRequest("Search must be " + MAX_QUERY_LENGTH + " characters or fewer.");
        String roleFilter = role == null || role.isBlank() ? null : role.trim().toLowerCase();
        if (roleFilter != null && !ROLES.contains(roleFilter)) throw badRequest("Role must be customer or admin.");

        List<String> conditions = new ArrayList<>();
        List<Object> arguments = new ArrayList<>();
        if (!search.isEmpty()) {
            String pattern = LikePattern.contains(search);
            conditions.add("(p.full_name ilike ? escape '\\' or p.email ilike ? escape '\\')");
            arguments.add(pattern);
            arguments.add(pattern);
        }
        if (roleFilter != null) {
            conditions.add("p.role = ?");
            arguments.add(roleFilter);
        }
        return new Filter(conditions.isEmpty() ? "" : "where " + String.join(" and ", conditions) + "\n", arguments);
    }

    private Summary summary(ResultSet resultSet, int rowNumber) throws SQLException {
        Timestamp lastOrder = resultSet.getTimestamp("last_order_at");
        return new Summary(
                resultSet.getObject("id", UUID.class),
                resultSet.getString("full_name"),
                resultSet.getString("email"),
                resultSet.getString("role"),
                resultSet.getTimestamp("created_at").toInstant(),
                resultSet.getLong("order_count"),
                resultSet.getBigDecimal("order_value"),
                lastOrder == null ? null : lastOrder.toInstant());
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
