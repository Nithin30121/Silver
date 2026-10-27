package com.silvestoluxe.api.product;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.math.BigDecimal;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

class StockLedgerTest {
    private final StockMovementRepository movements = mock(StockMovementRepository.class);
    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final StockLedger ledger = new StockLedger(movements, jdbcTemplate);

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
    void skipsEditsThatLeaveStockUnchanged() {
        ledger.record(TestProducts.product("Moon Ring", new BigDecimal("1000.00"), 7), 0, StockMovementReason.MANUAL, null, null);

        verifyNoInteractions(movements);
    }

    @Test
    void rejectsPagesOutsideTheAllowedRange() {
        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> ledger.history(null, 0, 500));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        verifyNoInteractions(jdbcTemplate);
    }
}
