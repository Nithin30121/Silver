package com.silvestoluxe.api.order;

import static com.silvestoluxe.api.order.OrderDtos.*;

import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class OrderController {
    private final OrderService orders;
    public OrderController(OrderService orders) { this.orders = orders; }

    @PostMapping("/orders")
    @ResponseStatus(HttpStatus.CREATED)
    public Response checkout(@AuthenticationPrincipal Jwt jwt, @RequestBody @Valid CheckoutRequest request) {
        return orders.checkout(jwt.getSubject(), request);
    }

    @GetMapping("/orders")
    public Page<Response> history(@AuthenticationPrincipal Jwt jwt, Pageable pageable) {
        return orders.history(jwt.getSubject(), pageable);
    }

    @GetMapping("/orders/{id}")
    public Response order(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return orders.customerOrder(jwt.getSubject(), id);
    }

    @GetMapping("/admin/orders")
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public Page<Response> all(Pageable pageable) { return orders.all(pageable); }

    @PatchMapping("/admin/orders/{id}/status")
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public Response updateStatus(@PathVariable UUID id, @RequestBody @Valid StatusUpdate request) {
        return orders.updateStatus(id, request);
    }
}
