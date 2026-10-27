package com.silvestoluxe.api.order;

import static com.silvestoluxe.api.order.OrderDtos.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.silvestoluxe.api.account.AccountProfileService;
import com.silvestoluxe.api.notification.OrderEmail;
import com.silvestoluxe.api.product.Product;
import com.silvestoluxe.api.product.ProductRepository;
import com.silvestoluxe.api.product.StockLedger;
import com.silvestoluxe.api.product.StockMovementReason;
import com.silvestoluxe.api.product.TestProducts;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class OrderServiceTest {
    private final CustomerOrderRepository orders = mock(CustomerOrderRepository.class);
    private final ProductRepository products = mock(ProductRepository.class);
    private final AccountProfileService profiles = mock(AccountProfileService.class);
    private final StockLedger stock = mock(StockLedger.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final OrderService service = new OrderService(orders, products, profiles, mock(EntityManager.class), stock, events);

    private final UUID customerId = UUID.randomUUID();
    private final UUID adminId = UUID.randomUUID();

    @Test
    void checkoutTakesStockRecordsTheSaleAndEmailsTheCustomer() {
        Product ring = TestProducts.product("Moon Ring", new BigDecimal("1000.00"), 5);
        signedInCustomer();
        when(products.findByIdForStockUpdate(ring.getId())).thenReturn(Optional.of(ring));
        when(orders.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));

        // The same product twice is merged into one line of three pieces.
        Response order = service.checkout(customerId.toString(), checkout(new CheckoutItem(ring.getId(), 1), new CheckoutItem(ring.getId(), 2)));

        assertEquals(2, ring.getStockQuantity());
        assertEquals(new BigDecimal("3000.00"), order.totalAmount());
        verify(stock).record(eq(ring), eq(-3), eq(StockMovementReason.SALE), any(), eq(customerId));
        ArgumentCaptor<OrderEmail> email = ArgumentCaptor.forClass(OrderEmail.class);
        verify(events).publishEvent(email.capture());
        assertEquals(OrderEmail.Kind.PLACED, email.getValue().kind());
        assertEquals("asha@example.com", email.getValue().to());
    }

    @Test
    void checkoutRefusesMoreThanTheStockWithoutRecordingAnything() {
        Product ring = TestProducts.product("Moon Ring", new BigDecimal("1000.00"), 1);
        signedInCustomer();
        when(products.findByIdForStockUpdate(ring.getId())).thenReturn(Optional.of(ring));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.checkout(customerId.toString(), checkout(new CheckoutItem(ring.getId(), 2))));

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        assertEquals(1, ring.getStockQuantity());
        verifyNoInteractions(stock, events);
    }

    @Test
    void cancellingReturnsStockOnceAndEmailsTheCustomer() {
        Product ring = TestProducts.product("Moon Ring", new BigDecimal("1000.00"), 2);
        CustomerOrder order = orderFor(ring, 3, OrderStatus.CONFIRMED);
        when(products.findByIdForStockUpdate(ring.getId())).thenReturn(Optional.of(ring));

        service.updateStatus(order.getId(), new StatusUpdate(OrderStatus.CANCELLED, PaymentStatus.PENDING, null, null), adminId);

        assertEquals(5, ring.getStockQuantity());
        verify(stock).record(eq(ring), eq(3), eq(StockMovementReason.CANCELLATION), any(), eq(adminId));
        ArgumentCaptor<OrderEmail> email = ArgumentCaptor.forClass(OrderEmail.class);
        verify(events).publishEvent(email.capture());
        assertEquals(OrderEmail.Kind.CANCELLED, email.getValue().kind());
    }

    @Test
    void skipsTheEmailWhenTheAdminUnticksIt() {
        Product ring = TestProducts.product("Moon Ring", new BigDecimal("1000.00"), 2);
        CustomerOrder order = orderFor(ring, 1, OrderStatus.PROCESSING);

        service.updateStatus(order.getId(), new StatusUpdate(OrderStatus.SHIPPED, PaymentStatus.PAID, null, false), adminId);

        assertEquals(OrderStatus.SHIPPED, order.getStatus());
        verify(events, never()).publishEvent(any());
    }

    @Test
    void doesNotEmailWhenOnlyThePaymentStatusChanges() {
        Product ring = TestProducts.product("Moon Ring", new BigDecimal("1000.00"), 2);
        CustomerOrder order = orderFor(ring, 1, OrderStatus.SHIPPED);

        service.updateStatus(order.getId(), new StatusUpdate(OrderStatus.SHIPPED, PaymentStatus.PAID, null, true), adminId);

        assertEquals(PaymentStatus.PAID, order.getPaymentStatus());
        verify(events, never()).publishEvent(any());
    }

    @Test
    void refusesToReopenADeliveredOrder() {
        Product ring = TestProducts.product("Moon Ring", new BigDecimal("1000.00"), 2);
        CustomerOrder order = orderFor(ring, 1, OrderStatus.DELIVERED);

        assertThrows(ResponseStatusException.class, () -> service.updateStatus(order.getId(),
                new StatusUpdate(OrderStatus.CANCELLED, PaymentStatus.REFUNDED, null, null), adminId));
        assertEquals(2, ring.getStockQuantity());
        verifyNoInteractions(stock, events);
    }

    @Test
    void emailsCustomersOnlyAboutStatusesTheyCareAbout() {
        assertEquals(OrderEmail.Kind.SHIPPED, OrderService.emailFor(OrderStatus.SHIPPED));
        assertNull(OrderService.emailFor(OrderStatus.PROCESSING));
        assertNull(OrderService.emailFor(OrderStatus.PENDING_PAYMENT));
    }

    @Test
    void refusesOverlongSearches() {
        assertThrows(ResponseStatusException.class, () -> OrderService.matching("a".repeat(OrderService.MAX_QUERY_LENGTH + 1), null));
    }

    private void signedInCustomer() {
        when(profiles.currentUser(customerId.toString())).thenReturn(new AccountProfileService.CurrentUser(
                customerId, "Asha Rao", "asha@example.com", "customer", Instant.now(), Instant.now()));
    }

    private CheckoutRequest checkout(CheckoutItem... items) {
        return new CheckoutRequest(List.of(items), PaymentMethod.UPI, "Asha Rao", "asha@example.com", "+91 90000 00001",
                "12 Sample Street", "Hyderabad", "Telangana", "500001");
    }

    private CustomerOrder orderFor(Product product, int quantity, OrderStatus status) {
        CustomerOrder order = new CustomerOrder(customerId, PaymentMethod.UPI, product.getPrice().multiply(BigDecimal.valueOf(quantity)),
                "Asha Rao", "asha@example.com", "+91 90000 00001", "12 Sample Street", "Hyderabad", "Telangana", "500001");
        order.addItem(new OrderItem(order, product.getId(), product.getName(), product.getSku(), product.getPrice(), quantity));
        order.setStatus(status);
        UUID id = UUID.randomUUID();
        org.springframework.test.util.ReflectionTestUtils.setField(order, "id", id);
        when(orders.findByIdForUpdate(id)).thenReturn(Optional.of(order));
        return order;
    }
}
