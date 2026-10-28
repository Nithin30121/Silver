package com.silvestoluxe.api.contact;

import static com.silvestoluxe.api.contact.ContactDtos.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import com.silvestoluxe.api.account.AccountProfileService;
import com.silvestoluxe.api.notification.ShopMessage;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class ContactServiceTest {
    private static final Instant NOW = Instant.parse("2026-10-28T10:00:00Z");

    private final ContactMessageRepository repository = mock(ContactMessageRepository.class);
    private final ContactRateLimiter limiter = mock(ContactRateLimiter.class);
    private final AccountProfileService profiles = mock(AccountProfileService.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final ContactService service = new ContactService(repository, limiter, profiles, events, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void savesTheMessageCleanedAndForwardsItToTheShop() {
        when(limiter.tryAcquire("203.0.113.7")).thenReturn(true);
        when(repository.save(any())).thenAnswer(call -> call.getArgument(0));

        service.submit(new ContactRequest("  Asha\r\nBcc: someone@example.com ", " asha@example.com ", "", "Ring\nsize",
                " SL-2026-00100002 ", "Hello,\r\nwhich size\u0007 fits?\n", ""), null, "203.0.113.7");

        ArgumentCaptor<ContactMessage> saved = ArgumentCaptor.forClass(ContactMessage.class);
        verify(repository).save(saved.capture());
        // Line breaks in one-line fields could add email headers, so they become spaces.
        assertEquals("Asha Bcc: someone@example.com", saved.getValue().getName());
        assertEquals("Ring size", saved.getValue().getSubject());
        assertEquals("asha@example.com", saved.getValue().getEmail());
        assertNull(saved.getValue().getPhone());
        assertEquals("SL-2026-00100002", saved.getValue().getOrderNumber());
        assertEquals("Hello,\nwhich size fits?", saved.getValue().getMessage());
        assertNull(saved.getValue().getCustomerId());
        ArgumentCaptor<ShopMessage> forwarded = ArgumentCaptor.forClass(ShopMessage.class);
        verify(events).publishEvent(forwarded.capture());
        assertEquals("asha@example.com", forwarded.getValue().email());
    }

    @Test
    void linksASignedInSendersAccount() {
        UUID customerId = UUID.randomUUID();
        when(limiter.tryAcquire(any())).thenReturn(true);
        when(repository.save(any())).thenAnswer(call -> call.getArgument(0));
        when(profiles.currentUser(customerId.toString())).thenReturn(new AccountProfileService.CurrentUser(
                customerId, "Asha", "asha@example.com", "customer", NOW, NOW));

        service.submit(request(""), customerId.toString(), "sender");

        ArgumentCaptor<ContactMessage> saved = ArgumentCaptor.forClass(ContactMessage.class);
        verify(repository).save(saved.capture());
        assertEquals(customerId, saved.getValue().getCustomerId());
    }

    @Test
    void quietlyDropsMessagesFromBots() {
        service.submit(request("https://spam.example"), null, "sender");

        verifyNoInteractions(limiter, repository, events);
    }

    @Test
    void refusesASenderOverTheLimit() {
        when(limiter.tryAcquire("sender")).thenReturn(false);

        ResponseStatusException refused = assertThrows(ResponseStatusException.class, () -> service.submit(request(""), null, "sender"));

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, refused.getStatusCode());
        verify(repository, never()).save(any());
        verifyNoInteractions(events);
    }

    @Test
    void markingDoneRecordsWhenAndMarkingNewClearsIt() {
        ContactMessage message = new ContactMessage("Asha", "asha@example.com", null, "", null, "Hello", null);
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.of(message));

        assertEquals(NOW, service.updateStatus(id, MessageStatus.DONE).handledAt());
        assertNull(service.updateStatus(id, MessageStatus.NEW).handledAt());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> service.updateStatus(UUID.randomUUID(), MessageStatus.DONE)).getStatusCode());
    }

    private static ContactRequest request(String website) {
        return new ContactRequest("Asha", "asha@example.com", "+91 90000 00001", "Sizing", null, "Which size fits?", website);
    }
}
