package com.silvestoluxe.api.account;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AddressDtos {
    private AddressDtos() { }

    /** makeDefault: true makes this the address checkout picks first. A customer's first address is always the default. */
    public record AddressRequest(
            @NotBlank(message = "Please enter the recipient's name.") @Size(max = 120) String fullName,
            @NotBlank(message = "Please enter a phone number.")
            @Pattern(regexp = "^\\+?[0-9 ()-]{7,20}$", message = "Please enter a valid phone number.") String phone,
            @NotBlank(message = "Please enter the street address.") @Size(max = 300) String addressLine,
            @NotBlank(message = "Please enter the city.") @Size(max = 120) String city,
            @NotBlank(message = "Please enter the state.") @Size(max = 120) String state,
            @NotBlank(message = "Please enter the PIN code.")
            @Pattern(regexp = "^[1-9][0-9]{5}$", message = "Please enter a 6-digit PIN code.") String postalCode,
            Boolean makeDefault) { }

    public record AddressResponse(UUID id, String fullName, String phone, String addressLine, String city,
                                  String state, String postalCode, boolean defaultAddress) { }
}
