package com.silvestoluxe.api.notification;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Lets the dashboard say whether customer emails will actually be sent. */
@RestController
@RequestMapping("/api/admin/notifications")
@PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
public class NotificationController {
    private final OrderEmailService emails;

    public NotificationController(OrderEmailService emails) { this.emails = emails; }

    @GetMapping("/email")
    public EmailStatus email() { return new EmailStatus(emails.isEnabled()); }

    public record EmailStatus(boolean enabled) { }
}
