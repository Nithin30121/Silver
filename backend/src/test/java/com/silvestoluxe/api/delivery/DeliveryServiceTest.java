package com.silvestoluxe.api.delivery;

import static com.silvestoluxe.api.delivery.DeliveryDtos.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.silvestoluxe.api.order.OrderDtos.Parcel;
import com.silvestoluxe.api.order.OrderDtos.ParcelItem;
import com.silvestoluxe.api.order.OrderService;
import com.silvestoluxe.api.order.OrderStatus;
import com.silvestoluxe.api.order.PaymentMethod;
import com.silvestoluxe.api.order.PaymentStatus;
import com.silvestoluxe.api.product.Product;
import com.silvestoluxe.api.product.ProductRepository;
import com.silvestoluxe.api.product.TestProducts;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

class DeliveryServiceTest {
    private static final Instant NOW = Instant.parse("2026-11-02T09:00:00Z");
    private final DelhiveryClient delhivery = mock(DelhiveryClient.class);
    private final OrderService orders = mock(OrderService.class);
    private final OrderShipmentRepository shipments = mock(OrderShipmentRepository.class);
    private final ProductRepository products = mock(ProductRepository.class);
    private final DeliveryService delivery = new DeliveryService(delhivery, orders, shipments, products, 100, 250, Clock.fixed(NOW, ZoneOffset.UTC));
    private final UUID orderId = UUID.randomUUID();

    @Test
    void booksAPaidOrderAsPrepaidAndGivesTheOrderItsTrackingNumber() {
        ready(parcel(OrderStatus.CONFIRMED, PaymentStatus.PAID, PaymentMethod.UPI));
        when(delhivery.book(any())).thenReturn("1490810000123");

        ShipmentRow row = delivery.book(orderId, 180);

        ArgumentCaptor<DelhiveryClient.Parcel> sent = ArgumentCaptor.forClass(DelhiveryClient.Parcel.class);
        verify(delhivery).book(sent.capture());
        assertEquals("SL-2026-00100001", sent.getValue().reference());
        assertFalse(sent.getValue().cashOnDelivery());
        assertEquals(BigDecimal.ZERO, sent.getValue().codAmount());
        assertEquals("9000000001", sent.getValue().phone());
        assertEquals(3, sent.getValue().quantity());
        assertEquals("Silver jewellery: Moon Ring x2, Star Chain", sent.getValue().description());
        assertEquals(OrderShipment.Payment.PREPAID, row.paymentMode());
        assertEquals("https://www.delhivery.com/track/package/1490810000123", row.trackingUrl());
        verify(orders).recordCourierBooking(orderId, "Delhivery", "1490810000123", "https://www.delhivery.com/track/package/1490810000123");
    }

    @Test
    void anUnpaidCashOrderIsCollectedAtTheDoorAndARebookingGetsItsOwnReference() {
        ready(parcel(OrderStatus.PROCESSING, PaymentStatus.PENDING, PaymentMethod.COD));
        when(shipments.countByOrderId(orderId)).thenReturn(1L);
        when(delhivery.book(any())).thenReturn("1490810000124");

        ShipmentRow row = delivery.book(orderId, 180);

        ArgumentCaptor<DelhiveryClient.Parcel> sent = ArgumentCaptor.forClass(DelhiveryClient.Parcel.class);
        verify(delhivery).book(sent.capture());
        assertEquals("SL-2026-00100001-2", sent.getValue().reference());
        assertTrue(sent.getValue().cashOnDelivery());
        assertEquals(new BigDecimal("4500.00"), sent.getValue().codAmount());
        assertEquals(OrderShipment.Payment.COD, row.paymentMode());
        assertEquals(new BigDecimal("4500.00"), row.codAmount());
    }

    @Test
    void ordersThatArentReadyAreNeverSentToDelhivery() {
        when(delhivery.isEnabled()).thenReturn(true);
        assertRefused(HttpStatus.CONFLICT, parcel(OrderStatus.PENDING_PAYMENT, PaymentStatus.PENDING, PaymentMethod.ONLINE));
        assertRefused(HttpStatus.CONFLICT, parcel(OrderStatus.CONFIRMED, PaymentStatus.PENDING, PaymentMethod.UPI));
        assertRefused(HttpStatus.CONFLICT, parcel(OrderStatus.SHIPPED, PaymentStatus.PAID, PaymentMethod.UPI));
        assertRefused(HttpStatus.CONFLICT, withPhone(parcel(OrderStatus.CONFIRMED, PaymentStatus.PAID, PaymentMethod.UPI), "12345"));
        when(shipments.existsByOrderIdAndStateNot(orderId, ShipmentState.CANCELLED)).thenReturn(true);
        assertRefused(HttpStatus.CONFLICT, parcel(OrderStatus.CONFIRMED, PaymentStatus.PAID, PaymentMethod.UPI));
        when(delhivery.isEnabled()).thenReturn(false);
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE,
                assertThrows(ResponseStatusException.class, () -> delivery.book(orderId, 180)).getStatusCode());
        verify(delhivery, never()).book(any());
    }

    @Test
    void aRefusalFromDelhiveryReachesTheOwnerAndBooksNothing() {
        ready(parcel(OrderStatus.CONFIRMED, PaymentStatus.PAID, PaymentMethod.UPI));
        when(delhivery.book(any())).thenThrow(new DelhiveryException("Delhivery did not book the parcel: Pincode is not serviceable"));

        ResponseStatusException refused = assertThrows(ResponseStatusException.class, () -> delivery.book(orderId, 180));

        assertEquals(HttpStatus.BAD_GATEWAY, refused.getStatusCode());
        assertEquals("Delhivery did not book the parcel: Pincode is not serviceable", refused.getReason());
        verify(shipments, never()).saveAndFlush(any());
        verify(orders, never()).recordCourierBooking(any(), any(), any(), any());
    }

    @Test
    void scansMoveTheOrderAlongOnceEach() {
        OrderShipment shipment = booked(ShipmentState.BOOKED);
        when(delhivery.isEnabled()).thenReturn(true);

        scan(shipment, "In Transit", "UD", "Hyderabad_Hub (Telangana)");
        scan(shipment, "Dispatched", "UD", "Mumbai_DC (Maharashtra)");
        scan(shipment, "Delivered", "DL", "Mumbai_DC (Maharashtra)");

        assertEquals(ShipmentState.DELIVERED, shipment.getState());
        assertEquals("Delivered", shipment.getCourierStatus());
        verify(orders, times(1)).markPickedUpByCourier(orderId, "Collected by Delhivery (Hyderabad_Hub (Telangana)).");
        verify(orders, times(1)).markDeliveredByCourier(orderId, "Delivered by Delhivery (Mumbai_DC (Maharashtra)).");
    }

    @Test
    void aParcelComingBackIsNotedAndCanThenBeClosed() {
        OrderShipment shipment = booked(ShipmentState.IN_TRANSIT);

        scan(shipment, "In Transit", "RT", "Mumbai_DC (Maharashtra)");
        assertThrows(ResponseStatusException.class, () -> delivery.closeReturned(orderId, shipment.getId(), UUID.randomUUID()));
        scan(shipment, "RTO", "DL", "Hyderabad_Hub (Telangana)");
        UUID owner = UUID.randomUUID();
        delivery.closeReturned(orderId, shipment.getId(), owner);

        assertEquals(ShipmentState.RETURNED, shipment.getState());
        verify(orders, times(2)).addNote(eq(orderId), any());
        verify(orders, never()).markDeliveredByCourier(any(), any());
        verify(orders).cancelReturnedByCourier(orderId, owner);
    }

    @Test
    void onlyAParcelWaitingForPickupCanBeCancelled() {
        OrderShipment waiting = booked(ShipmentState.BOOKED);
        ShipmentRow cancelled = delivery.cancel(orderId, waiting.getId());

        assertEquals(ShipmentState.CANCELLED, cancelled.state());
        verify(delhivery).cancel(waiting.getWaybill());
        verify(orders).clearCourierBooking(orderId, waiting.getWaybill(), "Delhivery booking " + waiting.getWaybill() + " cancelled.");

        OrderShipment moving = booked(ShipmentState.IN_TRANSIT);
        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class, () -> delivery.cancel(orderId, moving.getId())).getStatusCode());
        verify(delhivery, never()).cancel(moving.getWaybill());
    }

    @Test
    void pinCodeChecksAreRememberedAndNeverBlockCheckout() {
        assertFalse(delivery.check("500001").checked());
        when(delhivery.isEnabled()).thenReturn(true);
        when(delhivery.serviceability("500001")).thenReturn(new DelhiveryClient.Serviceability(true, false));

        assertEquals(new DeliveryCheck(true, true, false), delivery.check("500001"));
        assertEquals(new DeliveryCheck(true, true, false), delivery.check("500 001"));
        verify(delhivery, times(1)).serviceability("500001");

        when(delhivery.serviceability("400001")).thenThrow(new DelhiveryException("Delhivery could not be reached."));
        assertFalse(delivery.check("400001").checked());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class, () -> delivery.check("12345")).getStatusCode());
    }

    @Test
    void theRegularCheckAsksInBatchesAndCarriesOnPastAParcelDelhiveryDoesntKnow() {
        when(delhivery.isEnabled()).thenReturn(true);
        List<OrderShipment> due = new ArrayList<>();
        for (int i = 0; i < 30; i++) due.add(booked(ShipmentState.BOOKED));
        when(shipments.findToCheck(any(), any())).thenReturn(due);
        when(delhivery.track(anyList())).thenAnswer(call -> {
            List<String> waybills = call.getArgument(0);
            // Delhivery knows every parcel but the first.
            return waybills.stream().filter(waybill -> !waybill.equals(due.get(0).getWaybill()))
                    .map(waybill -> new DelhiveryClient.Tracking(waybill, "In Transit", "UD", "Hub", NOW)).toList();
        });

        delivery.checkMovingParcels();

        verify(delhivery, times(2)).track(anyList());
        assertEquals(ShipmentState.BOOKED, due.get(0).getState());
        assertEquals(NOW, due.get(0).getCheckedAt());
        assertEquals(ShipmentState.IN_TRANSIT, due.get(29).getState());
        verify(orders, times(29)).markPickedUpByCourier(eq(orderId), any());
    }

    @Test
    void suggestsAWeightFromThePiecesOrAUsualOneWhenAPieceHasNone() {
        Product ring = TestProducts.product("Moon Ring", new BigDecimal("2000.00"), 3);
        ring.setWeightGrams(new BigDecimal("4.200"));
        Product chain = TestProducts.product("Star Chain", new BigDecimal("500.00"), 3);
        when(products.findAllById(any())).thenReturn(List.of(ring));

        assertEquals(109, delivery.suggestedWeight(List.of(new ParcelItem(ring.getId(), "Moon Ring", 2))));
        assertEquals(250, delivery.suggestedWeight(List.of(new ParcelItem(ring.getId(), "Moon Ring", 1), new ParcelItem(chain.getId(), "Star Chain", 1))));
    }

    @Test
    void delhiveryGetsTheTenDigitMobileNumber() {
        assertEquals("9000000001", DeliveryService.phoneDigits("+91 90000 00001"));
        assertEquals("9000000001", DeliveryService.phoneDigits("09000000001"));
        assertEquals("9000000001", DeliveryService.phoneDigits("90000-00001"));
    }

    private void ready(Parcel parcel) {
        when(delhivery.isEnabled()).thenReturn(true);
        when(orders.parcel(orderId)).thenReturn(parcel);
        when(shipments.saveAndFlush(any())).thenAnswer(call -> withId(call.getArgument(0)));
    }

    private void assertRefused(HttpStatus status, Parcel parcel) {
        when(orders.parcel(orderId)).thenReturn(parcel);
        assertEquals(status, assertThrows(ResponseStatusException.class, () -> delivery.book(orderId, 180)).getStatusCode());
    }

    private OrderShipment booked(ShipmentState state) {
        OrderShipment shipment = withId(new OrderShipment(orderId, "DL" + UUID.randomUUID().toString().substring(0, 8), "SL-2026-00100001",
                OrderShipment.Payment.PREPAID, BigDecimal.ZERO, 180));
        if (state != ShipmentState.BOOKED) shipment.recordScan("In Transit", "UD", "Hub", NOW, state, NOW);
        when(shipments.findByIdAndOrderId(shipment.getId(), orderId)).thenReturn(Optional.of(shipment));
        when(shipments.save(shipment)).thenReturn(shipment);
        return shipment;
    }

    private void scan(OrderShipment shipment, String status, String type, String location) {
        when(delhivery.isEnabled()).thenReturn(true);
        when(delhivery.track(List.of(shipment.getWaybill()))).thenReturn(List.of(
                new DelhiveryClient.Tracking(shipment.getWaybill(), status, type, location, NOW)));
        delivery.refresh(orderId, shipment.getId());
    }

    private static OrderShipment withId(OrderShipment shipment) {
        if (shipment.getId() == null) ReflectionTestUtils.setField(shipment, "id", UUID.randomUUID());
        return shipment;
    }

    private Parcel parcel(OrderStatus status, PaymentStatus paymentStatus, PaymentMethod method) {
        return new Parcel(orderId, "SL-2026-00100001", status, paymentStatus, method, new BigDecimal("4500.00"), "Asha Rao",
                "+91 90000 00001", "12 Sample Street", "Hyderabad", "Telangana", "500001",
                List.of(new ParcelItem(UUID.randomUUID(), "Moon Ring", 2), new ParcelItem(UUID.randomUUID(), "Star Chain", 1)));
    }

    private static Parcel withPhone(Parcel parcel, String phone) {
        return new Parcel(parcel.id(), parcel.orderNumber(), parcel.status(), parcel.paymentStatus(), parcel.paymentMethod(),
                parcel.totalAmount(), parcel.fullName(), phone, parcel.address(), parcel.city(), parcel.state(), parcel.postalCode(),
                parcel.items());
    }
}
