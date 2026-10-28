package com.silvestoluxe.api.account;

import static com.silvestoluxe.api.account.AddressDtos.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

class AddressServiceTest {
    private final CustomerAddressRepository repository = mock(CustomerAddressRepository.class);
    private final AccountProfileService profiles = mock(AccountProfileService.class);
    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final AddressService service = new AddressService(repository, profiles, jdbcTemplate);

    private final UUID customerId = UUID.randomUUID();
    private final String subject = customerId.toString();

    @BeforeEach
    void signedIn() {
        when(profiles.currentUser(subject)).thenReturn(new AccountProfileService.CurrentUser(
                customerId, "Asha Rao", "asha@example.com", "customer", Instant.now(), Instant.now()));
        when(repository.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
    }

    @Test
    void theFirstAddressBecomesTheDefault() {
        when(repository.countByCustomerId(customerId)).thenReturn(0L);

        AddressResponse saved = service.create(subject, request(null));

        assertTrue(saved.defaultAddress());
        assertEquals("12 Sample Street", saved.addressLine());
        // The address book is locked first, so two saves at once can't both become the default.
        verify(jdbcTemplate).queryForObject(contains("for update"), eq(UUID.class), eq(customerId));
    }

    @Test
    void laterAddressesBecomeTheDefaultOnlyWhenAsked() {
        when(repository.countByCustomerId(customerId)).thenReturn(2L);

        assertFalse(service.create(subject, request(null)).defaultAddress());
        verify(repository, never()).clearDefault(any());

        assertTrue(service.create(subject, request(true)).defaultAddress());
        verify(repository).clearDefault(customerId);
    }

    @Test
    void refusesMoreThanTheAddressLimit() {
        when(repository.countByCustomerId(customerId)).thenReturn((long) AddressService.MAX_ADDRESSES);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> service.create(subject, request(null)));

        assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void someoneElsesAddressLooksLikeItDoesNotExist() {
        UUID addressId = UUID.randomUUID();
        when(repository.findByIdAndCustomerId(addressId, customerId)).thenReturn(Optional.empty());

        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> service.update(subject, addressId, request(true))).getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> service.delete(subject, addressId)).getStatusCode());
        verify(repository, never()).delete(any());
    }

    @Test
    void editingTrimsTheDetailsAndCanMoveTheDefault() {
        CustomerAddress address = saved(false);

        AddressResponse updated = service.update(subject, address.getId(),
                new AddressRequest("  Ravi Rao ", "98765 43210", " 4 New Road ", "Pune", "Maharashtra", "411001", true));

        assertEquals("Ravi Rao", updated.fullName());
        assertEquals("4 New Road", updated.addressLine());
        assertTrue(updated.defaultAddress());
        verify(repository).clearDefault(customerId);
    }

    @Test
    void deletingTheDefaultPassesItToTheOldestAddressLeft() {
        CustomerAddress removed = saved(true);
        CustomerAddress next = new CustomerAddress(customerId);
        when(repository.findFirstByCustomerIdOrderByCreatedAtAsc(customerId)).thenReturn(Optional.of(next));

        service.delete(subject, removed.getId());

        verify(repository).delete(removed);
        assertTrue(next.isDefaultAddress());
    }

    private CustomerAddress saved(boolean isDefault) {
        CustomerAddress address = new CustomerAddress(customerId);
        UUID id = UUID.randomUUID();
        org.springframework.test.util.ReflectionTestUtils.setField(address, "id", id);
        address.setDefaultAddress(isDefault);
        when(repository.findByIdAndCustomerId(id, customerId)).thenReturn(Optional.of(address));
        return address;
    }

    private static AddressRequest request(Boolean makeDefault) {
        return new AddressRequest("Asha Rao", "+91 90000 00001", "12 Sample Street", "Hyderabad", "Telangana", "500001", makeDefault);
    }
}
