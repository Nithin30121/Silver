package com.silvestoluxe.api.contact;

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

/** One message sent through the shop's contact form. */
@Entity
@Table(name = "contact_messages", schema = "public")
public class ContactMessage {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(nullable = false, updatable = false) private String name;
    @Column(nullable = false, updatable = false) private String email;
    @Column(updatable = false) private String phone;
    @Column(nullable = false, updatable = false) private String subject;
    @Column(updatable = false) private String orderNumber;
    @Column(nullable = false, updatable = false) private String message;
    @Column(name = "customer_id", updatable = false) private UUID customerId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private MessageStatus status = MessageStatus.NEW;
    @CreationTimestamp @Column(nullable = false, updatable = false) private Instant createdAt;
    private Instant handledAt;

    protected ContactMessage() { }

    public ContactMessage(String name, String email, String phone, String subject, String orderNumber, String message, UUID customerId) {
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.subject = subject;
        this.orderNumber = orderNumber;
        this.message = message;
        this.customerId = customerId;
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
    public String getSubject() { return subject; }
    public String getOrderNumber() { return orderNumber; }
    public String getMessage() { return message; }
    public UUID getCustomerId() { return customerId; }
    public MessageStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getHandledAt() { return handledAt; }

    public void setStatus(MessageStatus status, Instant at) {
        this.status = status;
        this.handledAt = status == MessageStatus.DONE ? at : null;
    }
}
