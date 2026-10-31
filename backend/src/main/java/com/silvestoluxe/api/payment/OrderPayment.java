package com.silvestoluxe.api.payment;

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

/** One attempt to pay for an order. Razorpay gives each attempt its own order id. */
@Entity
@Table(name = "order_payments", schema = "public")
public class OrderPayment {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(nullable = false, updatable = false) private UUID orderId;
    @Column(nullable = false, unique = true, updatable = false) private String razorpayOrderId;
    @Column(unique = true) private String razorpayPaymentId;
    @Column(nullable = false, precision = 12, scale = 2, updatable = false) private BigDecimal amount;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private OrderPaymentStatus status;
    private String method;
    private String failureReason;
    @CreationTimestamp @Column(nullable = false, updatable = false) private Instant createdAt;
    @UpdateTimestamp @Column(nullable = false) private Instant updatedAt;

    protected OrderPayment() { }
    public OrderPayment(UUID orderId, String razorpayOrderId, BigDecimal amount) {
        this.orderId = orderId;
        this.razorpayOrderId = razorpayOrderId;
        this.amount = amount;
        this.status = OrderPaymentStatus.CREATED;
    }

    /** Money has arrived for this attempt, so nothing later may change it except a refund. */
    public boolean hasMoney() { return status == OrderPaymentStatus.PAID || status == OrderPaymentStatus.NEEDS_REFUND; }
    public boolean isClosed() { return hasMoney() || status == OrderPaymentStatus.REFUNDED; }

    public void settle(OrderPaymentStatus status, String paymentId, String method, String reason) {
        this.status = status;
        this.razorpayPaymentId = paymentId;
        this.method = method;
        this.failureReason = reason;
    }

    public void markRefunded() { this.status = OrderPaymentStatus.REFUNDED; }

    public UUID getId() { return id; }
    public UUID getOrderId() { return orderId; }
    public String getRazorpayOrderId() { return razorpayOrderId; }
    public String getRazorpayPaymentId() { return razorpayPaymentId; }
    public BigDecimal getAmount() { return amount; }
    public OrderPaymentStatus getStatus() { return status; }
    public String getMethod() { return method; }
    public String getFailureReason() { return failureReason; }
    public Instant getCreatedAt() { return createdAt; }
}
