package com.silvestoluxe.api.order;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "orders", schema = "public")
public class CustomerOrder {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "order_number", nullable = false, unique = true, insertable = false, updatable = false) private String orderNumber;
    /** Null once the customer has deleted their account; the order keeps its own delivery snapshot. */
    @Column(name = "customer_id", updatable = false) private UUID customerId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private OrderStatus status;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private PaymentStatus paymentStatus;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private PaymentMethod paymentMethod;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal subtotal;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal shippingAmount;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal totalAmount;
    @Column(nullable = false) private String shippingFullName;
    @Column(nullable = false) private String shippingEmail;
    @Column(nullable = false) private String shippingPhone;
    @Column(nullable = false) private String shippingAddress;
    @Column(nullable = false) private String shippingCity;
    @Column(nullable = false) private String shippingState;
    @Column(nullable = false) private String shippingPostalCode;
    private String trackingCarrier;
    private String trackingNumber;
    private String trackingUrl;
    /** When an unpaid online order is cancelled and its pieces go back on sale. */
    private Instant paymentDueAt;
    @CreationTimestamp @Column(nullable = false, updatable = false) private Instant createdAt;
    @UpdateTimestamp @Column(nullable = false) private Instant updatedAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("createdAt ASC") private List<OrderItem> items = new ArrayList<>();
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("createdAt ASC") private List<OrderStatusHistory> statusHistory = new ArrayList<>();

    protected CustomerOrder() { }
    public CustomerOrder(UUID customerId, PaymentMethod paymentMethod, BigDecimal subtotal, String fullName, String email,
                         String phone, String address, String city, String state, String postalCode) {
        this.customerId = customerId;
        this.status = OrderStatus.PENDING_PAYMENT;
        this.paymentStatus = PaymentStatus.PENDING;
        this.paymentMethod = paymentMethod;
        this.subtotal = subtotal;
        this.shippingAmount = BigDecimal.ZERO;
        this.totalAmount = subtotal;
        this.shippingFullName = fullName;
        this.shippingEmail = email;
        this.shippingPhone = phone;
        this.shippingAddress = address;
        this.shippingCity = city;
        this.shippingState = state;
        this.shippingPostalCode = postalCode;
    }
    public void addItem(OrderItem item) { items.add(item); }
    public void recordStatus(OrderStatus nextStatus, String note) { statusHistory.add(new OrderStatusHistory(this, nextStatus, note)); }
    public UUID getId() { return id; }
    public String getOrderNumber() { return orderNumber; }
    public UUID getCustomerId() { return customerId; }
    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }
    public PaymentStatus getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(PaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }
    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }
    public Instant getPaymentDueAt() { return paymentDueAt; }
    public void setPaymentDueAt(Instant paymentDueAt) { this.paymentDueAt = paymentDueAt; }
    public BigDecimal getSubtotal() { return subtotal; }
    public BigDecimal getShippingAmount() { return shippingAmount; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public String getShippingFullName() { return shippingFullName; }
    public String getShippingEmail() { return shippingEmail; }
    public String getShippingPhone() { return shippingPhone; }
    public String getShippingAddress() { return shippingAddress; }
    public String getShippingCity() { return shippingCity; }
    public String getShippingState() { return shippingState; }
    public String getShippingPostalCode() { return shippingPostalCode; }
    public String getTrackingCarrier() { return trackingCarrier; }
    public String getTrackingNumber() { return trackingNumber; }
    public String getTrackingUrl() { return trackingUrl; }
    public void setTracking(String carrier, String number, String url) {
        this.trackingCarrier = carrier;
        this.trackingNumber = number;
        this.trackingUrl = url;
    }
    public Instant getCreatedAt() { return createdAt; }
    public List<OrderItem> getItems() { return items; }
    public List<OrderStatusHistory> getStatusHistory() { return statusHistory; }
}
