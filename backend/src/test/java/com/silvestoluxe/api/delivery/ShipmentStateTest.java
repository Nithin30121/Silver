package com.silvestoluxe.api.delivery;

import static com.silvestoluxe.api.delivery.ShipmentState.*;
import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class ShipmentStateTest {

    @Test
    void readsDelhiverysScans() {
        assertEquals(BOOKED, ShipmentState.from("Manifested", "UD", BOOKED));
        assertEquals(BOOKED, ShipmentState.from("Not Picked", "UD", BOOKED));
        assertEquals(IN_TRANSIT, ShipmentState.from("In Transit", "UD", BOOKED));
        assertEquals(IN_TRANSIT, ShipmentState.from("Dispatched", "UD", IN_TRANSIT));
        assertEquals(IN_TRANSIT, ShipmentState.from("Pending", "UD", IN_TRANSIT));
        assertEquals(DELIVERED, ShipmentState.from("Delivered", "DL", IN_TRANSIT));
        assertEquals(RETURNING, ShipmentState.from("In Transit", "RT", IN_TRANSIT));
        // A finished parcel that went back to the shop is not a delivery.
        assertEquals(RETURNED, ShipmentState.from("RTO", "DL", RETURNING));
        assertEquals(CANCELLED, ShipmentState.from("Canceled", "CN", BOOKED));
        assertEquals(LOST, ShipmentState.from("LOST", "UD", IN_TRANSIT));
    }

    @Test
    void aScanItCannotPlaceChangesNothing() {
        assertEquals(IN_TRANSIT, ShipmentState.from("Manifested", "UD", IN_TRANSIT));
        assertEquals(IN_TRANSIT, ShipmentState.from(null, null, IN_TRANSIT));
        assertEquals(BOOKED, ShipmentState.from("Something new", "ZZ", BOOKED));
    }

    @Test
    void onlyParcelsThatCanStillMoveAreChecked() {
        assertEquals(true, BOOKED.isMoving());
        assertEquals(true, RETURNING.isMoving());
        assertEquals(false, DELIVERED.isMoving());
        assertEquals(false, RETURNED.isMoving());
        assertEquals(false, CANCELLED.isMoving());
    }
}
