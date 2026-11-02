package com.silvestoluxe.api.delivery;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/** One parcel booked with Delhivery for an order. A cancelled booking stays as a record; a new one gets its own row. */
@Entity
@Table(name = "order_shipments", schema = "public")
public class OrderShipment {
    public enum Payment { PREPAID, COD }

    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(nullable = false, updatable = false) private UUID orderId;
    @Column(nullable = false, unique = true, updatable = false) private String waybill;
    @Column(nullable = false, updatable = false) private String reference;
    @Enumerated(EnumType.STRING) @Column(nullable = false, updatable = false) private Payment paymentMode;
    @Column(nullable = false, precision = 12, scale = 2, updatable = false) private BigDecimal codAmount;
    @Column(nullable = false, updatable = false) private int weightGrams;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private ShipmentState state;
    private String courierStatus;
    private String courierStatusType;
    private String courierLocation;
    private Instant courierStatusAt;
    private Instant checkedAt;
    private Instant cancelledAt;
    @CreationTimestamp @Column(nullable = false, updatable = false) private Instant createdAt;
    @UpdateTimestamp @Column(nullable = false) private Instant updatedAt;

    protected OrderShipment() { }
    public OrderShipment(UUID orderId, String waybill, String reference, Payment paymentMode, BigDecimal codAmount, int weightGrams) {
        this.orderId = orderId;
        this.waybill = waybill;
        this.reference = reference;
        this.paymentMode = paymentMode;
        this.codAmount = codAmount;
        this.weightGrams = weightGrams;
        this.state = ShipmentState.BOOKED;
    }

    /** Keeps Delhivery's latest scan as it was reported, along with the state worked out from it. */
    public void recordScan(String status, String statusType, String location, Instant at, ShipmentState next, Instant checked) {
        this.courierStatus = status;
        this.courierStatusType = statusType;
        this.courierLocation = location;
        this.courierStatusAt = at;
        this.checkedAt = checked;
        if (next == ShipmentState.CANCELLED && this.state != ShipmentState.CANCELLED) this.cancelledAt = checked;
        this.state = next;
    }

    public void markChecked(Instant checked) { this.checkedAt = checked; }

    public void cancel(Instant at) {
        this.state = ShipmentState.CANCELLED;
        this.cancelledAt = at;
    }

    public UUID getId() { return id; }
    public UUID getOrderId() { return orderId; }
    public String getWaybill() { return waybill; }
    public String getReference() { return reference; }
    public Payment getPaymentMode() { return paymentMode; }
    public BigDecimal getCodAmount() { return codAmount; }
    public int getWeightGrams() { return weightGrams; }
    public ShipmentState getState() { return state; }
    public String getCourierStatus() { return courierStatus; }
    public String getCourierStatusType() { return courierStatusType; }
    public String getCourierLocation() { return courierLocation; }
    public Instant getCourierStatusAt() { return courierStatusAt; }
    public Instant getCheckedAt() { return checkedAt; }
    public Instant getCancelledAt() { return cancelledAt; }
    public Instant getCreatedAt() { return createdAt; }
}
