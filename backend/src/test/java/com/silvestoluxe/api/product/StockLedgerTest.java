package com.silvestoluxe.api.product;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import com.silvestoluxe.api.notification.LowStockAlert;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.web.server.ResponseStatusException;

class StockLedgerTest {
    private final StockMovementRepository movements = mock(StockMovementRepository.class);
    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final StockLedger ledger = new StockLedger(movements, jdbcTemplate, events, 3);

    @Test
    void recordsTheChangeAndTheCountAfterIt() {
        Product ring = TestProducts.product("Moon Ring", new BigDecimal("1000.00"), 7);
        UUID admin = UUID.randomUUID();

        ledger.record(ring, -2, StockMovementReason.MANUAL, null, admin);

        ArgumentCaptor<StockMovement> movement = ArgumentCaptor.forClass(StockMovement.class);
        verify(movements).save(movement.capture());
        assertEquals(ring.getId(), movement.getValue().getProductId());
        assertEquals(-2, movement.getValue().getQuantityChange());
        assertEquals(7, movement.getValue().getQuantityAfter());
        assertEquals(admin, movement.getValue().getActorId());
    }

    @Test
    void alertsTheShopWhenASaleTakesAPieceDownToTheLowStockLine() {
        // Stock is applied before it is recorded: 5 pieces, 2 sold, 3 left.
        Product ring = TestProducts.product("Moon Ring", new BigDecimal("1000.00"), 3);
        UUID orderId = UUID.randomUUID();
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(orderId))).thenReturn(List.of("SL-20261029-0004"));

        ledger.record(ring, -2, StockMovementReason.SALE, orderId, UUID.randomUUID());

        LowStockAlert alert = publishedAlert();
        assertEquals("Moon Ring", alert.productName());
        assertEquals("MOON-RING", alert.sku());
        assertEquals(3, alert.quantityLeft());
        assertFalse(alert.soldOut());
        assertEquals("SL-20261029-0004", alert.orderNumber());
    }

    @Test
    void sendsOneSoldOutAlertWhenAHandEditEmptiesStock() {
        // From 5 straight to 0 crosses the low line too, but the shop hears only that it sold out.
        ledger.record(TestProducts.product("Moon Ring", new BigDecimal("1000.00"), 0), -5, StockMovementReason.MANUAL, null, UUID.randomUUID());

        LowStockAlert alert = publishedAlert();
        assertTrue(alert.soldOut());
        assertEquals(0, alert.quantityLeft());
        assertNull(alert.orderNumber());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void alertsOnlyAtTheMomentOfCrossing() {
        ledger.record(TestProducts.product("Already low", new BigDecimal("1000.00"), 2), -1, StockMovementReason.SALE, null, null);
        ledger.record(TestProducts.product("Plenty left", new BigDecimal("1000.00"), 4), -1, StockMovementReason.SALE, null, null);

        verifyNoInteractions(events);
    }

    @Test
    void staysQuietForRestocksNewProductsAndHiddenPieces() {
        Product hidden = TestProducts.product("Hidden", new BigDecimal("1000.00"), 0);
        hidden.setActive(false);

        ledger.record(TestProducts.product("Restocked", new BigDecimal("1000.00"), 10), 9, StockMovementReason.MANUAL, null, null);
        ledger.record(TestProducts.product("New", new BigDecimal("1000.00"), 2), 2, StockMovementReason.INITIAL, null, null);
        ledger.record(TestProducts.product("Returned", new BigDecimal("1000.00"), 1), 1, StockMovementReason.CANCELLATION, null, null);
        ledger.record(hidden, -4, StockMovementReason.MANUAL, null, null);

        verifyNoInteractions(events);
    }

    @Test
    void skipsEditsThatLeaveStockUnchanged() {
        ledger.record(TestProducts.product("Moon Ring", new BigDecimal("1000.00"), 7), 0, StockMovementReason.MANUAL, null, null);

        verifyNoInteractions(movements, events);
    }

    @Test
    void rejectsPagesOutsideTheAllowedRange() {
        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> ledger.history(null, 0, 500));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }

    private LowStockAlert publishedAlert() {
        ArgumentCaptor<LowStockAlert> alert = ArgumentCaptor.forClass(LowStockAlert.class);
        verify(events).publishEvent(alert.capture());
        return alert.getValue();
    }
}
