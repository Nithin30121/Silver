package com.silvestoluxe.api.contact;

import static com.silvestoluxe.api.contact.ContactDtos.*;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

import com.silvestoluxe.api.account.AccountProfileService;
import com.silvestoluxe.api.notification.ShopMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Saves contact form messages for the admin inbox and tells the shop by email when email is set up. */
@Service
@Transactional(readOnly = true)
public class ContactService {
    static final int MAX_PAGE_SIZE = 100;

    private final ContactMessageRepository messages;
    private final ContactRateLimiter limiter;
    private final AccountProfileService profiles;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    @Autowired
    public ContactService(ContactMessageRepository messages, ContactRateLimiter limiter, AccountProfileService profiles,
                          ApplicationEventPublisher events) {
        this(messages, limiter, profiles, events, Clock.systemUTC());
    }

    ContactService(ContactMessageRepository messages, ContactRateLimiter limiter, AccountProfileService profiles,
                   ApplicationEventPublisher events, Clock clock) {
        this.messages = messages;
        this.limiter = limiter;
        this.profiles = profiles;
        this.events = events;
        this.clock = clock;
    }

    /**
     * subject is the signed-in sender's token subject, or null for a visitor. The sender is never
     * emailed, so the form can't be used to send mail to someone else's address.
     */
    @Transactional
    public void submit(ContactRequest request, String subject, String sender) {
        // A filled-in hidden field means a bot: report success so it moves on, and keep nothing.
        if (request.website() != null && !request.website().isBlank()) return;
        if (!limiter.tryAcquire(sender)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "You've sent several messages in a short time. Please wait a few minutes and try again.");
        }
        ContactMessage saved = messages.save(new ContactMessage(line(request.name()), request.email().trim(),
                optional(request.phone()), line(request.subject()), optional(request.orderNumber()),
                text(request.message()), accountOf(subject)));
        events.publishEvent(new ShopMessage(saved.getName(), saved.getEmail(), saved.getPhone(), saved.getSubject(),
                saved.getOrderNumber(), saved.getMessage()));
    }

    /** Newest first; status null lists every message. */
    public Page<MessageResponse> list(MessageStatus status, int page, int size) {
        PageRequest request = PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE));
        Page<ContactMessage> found = status == null ? messages.findAllByOrderByCreatedAtDesc(request)
                : messages.findByStatusOrderByCreatedAtDesc(status, request);
        return found.map(ContactService::response);
    }

    @Transactional
    public MessageResponse updateStatus(UUID id, MessageStatus status) {
        ContactMessage message = messages.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found."));
        if (message.getStatus() != status) message.setStatus(status, clock.instant());
        return response(message);
    }

    private UUID accountOf(String subject) {
        if (subject == null) return null;
        try {
            return profiles.currentUser(subject).id();
        } catch (ResponseStatusException exception) {
            return null; // the message still matters even if the account can't be matched
        }
    }

    /** Single-line fields lose line breaks and control characters, so they stay safe in email headers. */
    static String line(String value) {
        if (value == null) return "";
        return value.replaceAll("[\\p{Cntrl}\\s]+", " ").trim();
    }

    private static String optional(String value) {
        String cleaned = line(value);
        return cleaned.isEmpty() ? null : cleaned;
    }

    /** The message keeps its line breaks but drops other control characters. */
    static String text(String value) {
        return value.replace("\r\n", "\n").replaceAll("[\\p{Cntrl}&&[^\n\t]]", "").trim();
    }

    static MessageResponse response(ContactMessage message) {
        return new MessageResponse(message.getId(), message.getName(), message.getEmail(), message.getPhone(),
                message.getSubject(), message.getOrderNumber(), message.getMessage(), message.getStatus(),
                message.getCustomerId() != null, message.getCreatedAt(), message.getHandledAt());
    }
}
