package com.silvestoluxe.api.contact;

import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class ContactDtos {
    private ContactDtos() { }

    /** website is a hidden field people never see; only bots fill it in. */
    public record ContactRequest(
            @NotBlank(message = "Please enter your name.") @Size(max = 120, message = "Please keep your name under 120 characters.") String name,
            @NotBlank(message = "Please enter your email address.") @Email(message = "Please enter a valid email address.")
            @Size(max = 254) String email,
            @Pattern(regexp = "^$|^\\+?[0-9 ()-]{7,20}$", message = "Please enter a valid phone number.") String phone,
            @Size(max = 150, message = "Please keep the subject under 150 characters.") String subject,
            @Size(max = 40, message = "Please check the order number.") String orderNumber,
            @NotBlank(message = "Please write your message.") @Size(max = 5000, message = "Please keep your message under 5,000 characters.") String message,
            String website) { }

    public record MessageResponse(UUID id, String name, String email, String phone, String subject, String orderNumber,
                                  String message, MessageStatus status, boolean fromAccount, Instant createdAt, Instant handledAt) { }

    public record StatusUpdate(@NotNull MessageStatus status) { }
}
