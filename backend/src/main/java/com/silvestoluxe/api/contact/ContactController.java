package com.silvestoluxe.api.contact;

import static com.silvestoluxe.api.contact.ContactDtos.*;

import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ContactController {
    private final ContactService contact;

    public ContactController(ContactService contact) { this.contact = contact; }

    /** Open to everyone; a signed-in sender's message is linked to their account. */
    @PostMapping("/contact")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void send(@AuthenticationPrincipal Jwt jwt, @RequestBody @Valid ContactRequest request, HttpServletRequest http) {
        contact.submit(request, jwt == null ? null : jwt.getSubject(), sender(http));
    }

    @GetMapping("/admin/messages")
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public Page<MessageResponse> list(@RequestParam(required = false) MessageStatus status,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "25") int size) {
        return contact.list(status, page, size);
    }

    @PatchMapping("/admin/messages/{id}/status")
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public MessageResponse updateStatus(@PathVariable UUID id, @RequestBody @Valid StatusUpdate request) {
        return contact.updateStatus(id, request.status());
    }

    /**
     * Who is sending, for the rate limit. Hosts such as Render put the visitor's address first in
     * X-Forwarded-For; it can be faked, which is why the limiter also caps the whole shop.
     */
    static String sender(HttpServletRequest http) {
        String forwarded = http.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) return forwarded.split(",")[0].trim();
        return http.getRemoteAddr();
    }
}
