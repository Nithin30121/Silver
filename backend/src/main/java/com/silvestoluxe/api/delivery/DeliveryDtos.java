package com.silvestoluxe.api.delivery;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public final class DeliveryDtos {
    private DeliveryDtos() { }

    /** The weight of the packed parcel, box included, which Delhivery charges by. */
    public record BookRequest(@Min(1) @Max(50_000) int weightGrams) { }

    public record ShipmentRow(UUID id, String waybill, ShipmentState state, OrderShipment.Payment paymentMode, BigDecimal codAmount,
                              int weightGrams, String courierStatus, String courierLocation, Instant courierStatusAt,
                              String trackingUrl, Instant bookedAt, Instant checkedAt, Instant cancelledAt) { }

    /** An order's bookings, newest first, and a starting weight for a new one worked out from its pieces. */
    public record OrderShipments(boolean enabled, int suggestedWeightGrams, List<ShipmentRow> shipments) { }

    /** checked is false when Delhivery isn't set up or couldn't be asked; checkout then carries on as before. */
    public record DeliveryCheck(boolean checked, boolean serviceable, boolean cashOnDelivery) { }
}
