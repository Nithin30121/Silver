package com.silvestoluxe.api.product;

import static com.silvestoluxe.api.product.ProductDtos.StockMovementResponse;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Writes and reads stock history. Callers record a change after applying it, inside their own transaction. */
@Service
public class StockLedger {
    static final int MAX_PAGE_SIZE = 100;

    private static final String MOVEMENTS = """
            select m.id, m.product_id, p.name as product_name, p.sku as product_sku, m.quantity_change, m.quantity_after,
                   m.reason, m.order_id, o.order_number, coalesce(nullif(a.full_name, ''), a.email) as actor_name, m.created_at
            from public.stock_movements m
            join public.products p on p.id = m.product_id
            left join public.orders o on o.id = m.order_id
            left join public.profiles a on a.id = m.actor_id
            """;

    private final StockMovementRepository movements;
    private final JdbcTemplate jdbcTemplate;

    public StockLedger(StockMovementRepository movements, JdbcTemplate jdbcTemplate) {
        this.movements = movements;
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Records a change already applied to the product. A change of zero is not history, so it is skipped. */
    public void record(Product product, int quantityChange, StockMovementReason reason, UUID orderId, UUID actorId) {
        if (quantityChange == 0) return;
        movements.save(new StockMovement(product.getId(), quantityChange, product.getStockQuantity(), reason, orderId, actorId));
    }

    /** Newest first; a null product id lists changes across the whole catalogue. */
    public Page<StockMovementResponse> history(UUID productId, int page, int size) {
        if (page < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page must not be negative.");
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page size must be between 1 and " + MAX_PAGE_SIZE + ".");
        }
        String where = productId == null ? "" : "where m.product_id = ?\n";
        List<Object> arguments = new ArrayList<>();
        if (productId != null) arguments.add(productId);

        Long total = jdbcTemplate.queryForObject("select count(*) from public.stock_movements m\n" + where, Long.class, arguments.toArray());
        arguments.add(size);
        arguments.add((long) page * size);
        List<StockMovementResponse> rows = jdbcTemplate.query(MOVEMENTS + where
                + "order by m.created_at desc, m.id\nlimit ? offset ?", this::movement, arguments.toArray());
        return new PageImpl<>(rows, PageRequest.of(page, size), total == null ? 0 : total);
    }

    private StockMovementResponse movement(ResultSet resultSet, int rowNumber) throws SQLException {
        return new StockMovementResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getObject("product_id", UUID.class),
                resultSet.getString("product_name"),
                resultSet.getString("product_sku"),
                resultSet.getInt("quantity_change"),
                resultSet.getInt("quantity_after"),
                StockMovementReason.valueOf(resultSet.getString("reason")),
                resultSet.getObject("order_id", UUID.class),
                resultSet.getString("order_number"),
                resultSet.getString("actor_name"),
                resultSet.getTimestamp("created_at").toInstant());
    }
}
