package com.silvestoluxe.api.payment;

import static com.silvestoluxe.api.payment.PaymentDtos.*;

import java.util.List;
import java.util.UUID;

import com.silvestoluxe.api.order.OrderDtos.Response;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class PaymentController {
    private final PaymentService payments;

    public PaymentController(PaymentService payments) { this.payments = payments; }

    @GetMapping("/orders/payment-options")
    public PaymentOptions options() { return payments.options(); }

    @PostMapping("/orders/{id}/payment")
    public StartedPayment start(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return payments.start(jwt.getSubject(), id);
    }

    @PostMapping("/orders/{id}/payment/verify")
    public Response verify(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody @Valid PaymentProof proof) {
        return payments.verify(jwt.getSubject(), id, proof);
    }

    @GetMapping("/admin/orders/{id}/payments")
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public List<PaymentRow> forOrder(@PathVariable UUID id) { return payments.forOrder(id); }

    @GetMapping("/admin/payments/refunds-to-make")
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public List<RefundToMake> refundsToMake() { return payments.refundsToMake(); }
}
