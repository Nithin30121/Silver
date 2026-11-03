package com.silvestoluxe.api.order;

import java.util.UUID;

import com.silvestoluxe.api.delivery.DeliveryService;
import com.silvestoluxe.api.payment.PaymentService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Lets the admin remove an order that never went anywhere, such as a test order. An order stays if an
 * online payment was ever started for it, because Razorpay can still settle that payment, or if it was
 * booked with Delhivery, because the parcel has its own record there.
 */
@Service
public class OrderDeletionService {
    private final OrderService orders;
    private final PaymentService payments;
    private final DeliveryService deliveries;

    public OrderDeletionService(OrderService orders, PaymentService payments, DeliveryService deliveries) {
        this.orders = orders;
        this.payments = payments;
        this.deliveries = deliveries;
    }

    @Transactional
    public String delete(UUID orderId, UUID actorId) {
        // Locked first, so a payment or booking can't start between these checks and the delete.
        orders.lock(orderId);
        if (payments.hasPaymentRecord(orderId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "An online payment was started for this order, so it's kept as the record of that payment.");
        }
        if (deliveries.hasBooking(orderId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This order was booked with Delhivery, so it's kept with its parcel's record.");
        }
        return orders.deleteUnpaid(orderId, actorId);
    }
}
