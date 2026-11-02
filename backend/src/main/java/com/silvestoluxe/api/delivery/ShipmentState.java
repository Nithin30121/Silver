package com.silvestoluxe.api.delivery;

import java.util.Locale;
import java.util.Set;

/** Where a booked parcel is, worked out from Delhivery's latest scan. */
public enum ShipmentState {
    BOOKED, IN_TRANSIT, DELIVERED, RETURNING, RETURNED, LOST, CANCELLED;

    /** Delhivery's scans before a courier has collected the parcel. */
    private static final Set<String> WAITING_FOR_PICKUP = Set.of("manifested", "not picked", "open", "scheduled");

    /** Parcels whose scans can still change, so the shop keeps asking Delhivery about them. */
    public boolean isMoving() { return this == BOOKED || this == IN_TRANSIT || this == RETURNING; }

    /**
     * Reads Delhivery's status and status type (UD on the way out, DL finished, RT coming back, CN cancelled).
     * A finished parcel is delivered only when the status says so: DL with "RTO" means it came back to the shop.
     * A scan this can't place leaves the state as it was.
     */
    public static ShipmentState from(String status, String statusType, ShipmentState current) {
        String scan = status == null ? "" : status.trim().toLowerCase(Locale.ROOT);
        String type = statusType == null ? "" : statusType.trim().toUpperCase(Locale.ROOT);
        if (scan.equals("lost")) return LOST;
        if (type.equals("CN") || scan.equals("cancelled") || scan.equals("canceled")) return CANCELLED;
        if (type.equals("DL")) return scan.equals("delivered") ? DELIVERED : RETURNED;
        if (type.equals("RT")) return RETURNING;
        if (type.equals("UD") || type.isEmpty()) {
            if (WAITING_FOR_PICKUP.contains(scan)) return current;
            if (!scan.isEmpty()) return IN_TRANSIT;
        }
        return current;
    }
}
