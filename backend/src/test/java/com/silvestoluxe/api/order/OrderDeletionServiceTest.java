package com.silvestoluxe.api.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.UUID;

import com.silvestoluxe.api.delivery.DeliveryService;
import com.silvestoluxe.api.payment.PaymentService;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class OrderDeletionServiceTest {
    private final OrderService orders = mock(OrderService.class);
    private final PaymentService payments = mock(PaymentService.class);
    private final DeliveryService deliveries = mock(DeliveryService.class);
    private final OrderDeletionService service = new OrderDeletionService(orders, payments, deliveries);
    private final UUID orderId = UUID.randomUUID();
    private final UUID adminId = UUID.randomUUID();

    @Test
    void locksTheOrderBeforeCheckingAndThenDeletesIt() {
        when(orders.deleteUnpaid(orderId, adminId)).thenReturn("SL-2026-00000001");

        assertEquals("SL-2026-00000001", service.delete(orderId, adminId));

        InOrder order = inOrder(orders, payments, deliveries);
        order.verify(orders).lock(orderId);
        order.verify(payments).hasPaymentRecord(orderId);
        order.verify(deliveries).hasBooking(orderId);
        order.verify(orders).deleteUnpaid(orderId, adminId);
    }

    @Test
    void keepsAnOrderAnOnlinePaymentWasStartedFor() {
        when(payments.hasPaymentRecord(orderId)).thenReturn(true);

        ResponseStatusException refused = assertThrows(ResponseStatusException.class, () -> service.delete(orderId, adminId));

        assertEquals(HttpStatus.CONFLICT, refused.getStatusCode());
        verify(orders, never()).deleteUnpaid(any(), any());
    }

    @Test
    void keepsAnOrderBookedWithDelhivery() {
        when(deliveries.hasBooking(orderId)).thenReturn(true);

        ResponseStatusException refused = assertThrows(ResponseStatusException.class, () -> service.delete(orderId, adminId));

        assertEquals(HttpStatus.CONFLICT, refused.getStatusCode());
        verify(orders, never()).deleteUnpaid(any(), any());
    }
}
