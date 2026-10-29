package com.silvestoluxe.api.order;

import static com.silvestoluxe.api.order.OrderDtos.*;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

import com.silvestoluxe.api.security.CurrentActor;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
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
    /** The shop's time zone, the same one the sales reports count days in. */
    private final ZoneId zone;

    public OrderController(OrderService orders, @Value("${app.reports.time-zone:Asia/Kolkata}") String zone) {
        this.orders = orders;
        this.zone = ZoneId.of(zone);
    }

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

    @PostMapping("/orders/{id}/cancel")
    public Response cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return orders.cancelByCustomer(jwt.getSubject(), id);
    }

    @GetMapping("/admin/orders")
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public Page<Response> all(@RequestParam(required = false) String query,
                              @RequestParam(required = false) OrderStatus status,
                              @RequestParam(required = false) LocalDate from,
                              @RequestParam(required = false) LocalDate to,
                              Pageable pageable) {
        return orders.search(query, status, PlacedBetween.days(from, to, zone), pageable);
    }

    @PatchMapping("/admin/orders/{id}/status")
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public Response updateStatus(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody @Valid StatusUpdate request) {
        return orders.updateStatus(id, request, CurrentActor.idOf(jwt));
    }
}
