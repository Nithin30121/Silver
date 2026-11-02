package com.silvestoluxe.api.delivery;

import static com.silvestoluxe.api.delivery.DeliveryDtos.*;

import java.util.UUID;

import com.silvestoluxe.api.security.CurrentActor;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class DeliveryController {
    private final DeliveryService delivery;

    public DeliveryController(DeliveryService delivery) { this.delivery = delivery; }

    /** For signed-in shoppers at checkout. */
    @GetMapping("/orders/delivery-check")
    public DeliveryCheck check(@RequestParam String pin) { return delivery.check(pin); }

    @GetMapping("/admin/orders/{id}/shipments")
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public OrderShipments forOrder(@PathVariable UUID id) { return delivery.forOrder(id); }

    @PostMapping("/admin/orders/{id}/shipments") @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public ShipmentRow book(@PathVariable UUID id, @RequestBody @Valid BookRequest request) {
        return delivery.book(id, request.weightGrams());
    }

    @PostMapping("/admin/orders/{id}/shipments/{shipmentId}/refresh")
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public ShipmentRow refresh(@PathVariable UUID id, @PathVariable UUID shipmentId) { return delivery.refresh(id, shipmentId); }

    @PostMapping("/admin/orders/{id}/shipments/{shipmentId}/cancel")
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public ShipmentRow cancel(@PathVariable UUID id, @PathVariable UUID shipmentId) { return delivery.cancel(id, shipmentId); }

    @PostMapping("/admin/orders/{id}/shipments/{shipmentId}/returned") @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public void closeReturned(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @PathVariable UUID shipmentId) {
        delivery.closeReturned(id, shipmentId, CurrentActor.idOf(jwt));
    }
}
