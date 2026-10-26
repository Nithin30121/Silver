package com.silvestoluxe.api.order;

import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "order_status_history", schema = "public")
public class OrderStatusHistory {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "order_id", nullable = false) private CustomerOrder order;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private OrderStatus status;
    @Column(nullable = false) private String note;
    @CreationTimestamp @Column(nullable = false, updatable = false) private Instant createdAt;
    protected OrderStatusHistory() { }
    public OrderStatusHistory(CustomerOrder order, OrderStatus status, String note) { this.order = order; this.status = status; this.note = note; }
    public OrderStatus getStatus() { return status; }
    public String getNote() { return note; }
    public Instant getCreatedAt() { return createdAt; }
}
