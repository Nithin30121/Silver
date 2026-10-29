package com.silvestoluxe.api.account;

import static com.silvestoluxe.api.account.AddressDtos.*;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

/** The signed-in customer's saved delivery addresses. */
@RestController
@RequestMapping("/api/me/addresses")
public class AddressController {
    private final AddressService addresses;

    public AddressController(AddressService addresses) { this.addresses = addresses; }

    @GetMapping
    public List<AddressResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return addresses.list(jwt.getSubject());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AddressResponse create(@AuthenticationPrincipal Jwt jwt, @RequestBody @Valid AddressRequest request) {
        return addresses.create(jwt.getSubject(), request);
    }

    @PutMapping("/{id}")
    public AddressResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestBody @Valid AddressRequest request) {
        return addresses.update(jwt.getSubject(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        addresses.delete(jwt.getSubject(), id);
    }
}
