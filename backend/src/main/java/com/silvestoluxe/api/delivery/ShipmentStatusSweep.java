package com.silvestoluxe.api.delivery;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Runs only while the server is awake, so on the free plan a parcel's news may wait for the next visit. The first check
 * comes soon after the server starts, because a sleeping free server may not stay up for a full interval.
 */
@Component
class ShipmentStatusSweep {
    private final DeliveryService delivery;

    ShipmentStatusSweep(DeliveryService delivery) { this.delivery = delivery; }

    @Scheduled(fixedDelayString = "${app.delhivery.check-every:PT30M}", initialDelayString = "${app.delhivery.first-check-after:PT2M}")
    void run() { delivery.checkMovingParcels(); }
}
