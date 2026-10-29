package com.silvestoluxe.api.order;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Request/response records deliberately exclude any card number, CVV, or payment credential. */
public final class OrderDtos {
    private OrderDtos() { }

    public record CheckoutRequest(
            @NotEmpty List<@Valid CheckoutItem> items,
            @NotNull PaymentMethod paymentMethod,
            @NotBlank @Size(max = 120) String shippingFullName,
            @NotBlank @Email @Size(max = 254) String shippingEmail,
            @NotBlank @Size(max = 40) String shippingPhone,
            @NotBlank @Size(max = 300) String shippingAddress,
            @NotBlank @Size(max = 120) String shippingCity,
            @NotBlank @Size(max = 120) String shippingState,
            @NotBlank @Size(max = 30) String shippingPostalCode) { }

    public record CheckoutItem(@NotNull UUID productId, @Min(1) @Max(99) int quantity) { }

    /**
     * notifyCustomer defaults to true; customers are emailed only when email is set up on the server.
     * Tracking fields left null keep the order's current tracking; blank values clear it.
     */
    public record StatusUpdate(@NotNull OrderStatus status,
                               @NotNull PaymentStatus paymentStatus,
                               @Size(max = 500) String note,
                               Boolean notifyCustomer,
                               @Size(max = 80) String trackingCarrier,
                               @Size(max = 80) String trackingNumber,
                               @Size(max = 500) String trackingUrl) { }

    public record ItemResponse(UUID productId, String productName, String productSku, BigDecimal unitPrice,
                               int quantity, BigDecimal lineTotal) { }

    public record StatusHistoryResponse(OrderStatus status, String note, Instant createdAt) { }

    public record Response(UUID id, String orderNumber, OrderStatus status, PaymentStatus paymentStatus,
                           PaymentMethod paymentMethod, BigDecimal subtotal, BigDecimal shippingAmount,
                           BigDecimal totalAmount, String shippingFullName, String shippingEmail,
                           String shippingPhone, String shippingAddress, String shippingCity,
                           String shippingState, String shippingPostalCode, Instant createdAt,
                           List<ItemResponse> items, List<StatusHistoryResponse> statusHistory,
                           String trackingCarrier, String trackingNumber, String trackingUrl,
                           /** Whether the customer may still cancel this order themselves. */
                           boolean canCancel) { }
}
