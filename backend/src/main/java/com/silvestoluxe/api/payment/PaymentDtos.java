package com.silvestoluxe.api.payment;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** The patterns matter: the two ids from the browser go into addresses this server calls. */
public final class PaymentDtos {
    private PaymentDtos() { }

    public record PaymentOptions(boolean online) { }

    /** What Razorpay's window needs. The amount comes from the order this server saved, never from the browser. */
    public record StartedPayment(String keyId, String razorpayOrderId, long amountInPaise, String currency, String shopName,
                                 String orderNumber, String customerName, String customerEmail, String customerPhone) { }

    public record PaymentProof(@NotBlank @Pattern(regexp = "order_[A-Za-z0-9]{1,40}") String razorpayOrderId,
                               @NotBlank @Pattern(regexp = "pay_[A-Za-z0-9]{1,40}") String razorpayPaymentId,
                               @NotBlank @Pattern(regexp = "[0-9a-f]{64}") String razorpaySignature) { }

    public record PaymentRow(UUID id, BigDecimal amount, OrderPaymentStatus status, String method, String razorpayOrderId,
                             String razorpayPaymentId, String failureReason, Instant createdAt) { }

    public record RefundToMake(UUID orderId, String orderNumber, BigDecimal amount, String razorpayPaymentId, String reason) { }
}
