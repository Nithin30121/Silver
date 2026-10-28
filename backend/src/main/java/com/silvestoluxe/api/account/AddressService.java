package com.silvestoluxe.api.account;

import static com.silvestoluxe.api.account.AddressDtos.*;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** The signed-in customer's address book. Every query is scoped to the token's own profile. */
@Service
@Transactional(readOnly = true)
public class AddressService {
    static final int MAX_ADDRESSES = 10;

    private final CustomerAddressRepository addresses;
    private final AccountProfileService profiles;
    private final JdbcTemplate jdbcTemplate;

    public AddressService(CustomerAddressRepository addresses, AccountProfileService profiles, JdbcTemplate jdbcTemplate) {
        this.addresses = addresses;
        this.profiles = profiles;
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<AddressResponse> list(String subject) {
        UUID customerId = profiles.currentUser(subject).id();
        return addresses.findByCustomerIdOrderByDefaultAddressDescCreatedAtAsc(customerId).stream().map(AddressService::response).toList();
    }

    @Transactional
    public AddressResponse create(String subject, AddressRequest request) {
        UUID customerId = lockAddressBook(subject);
        long saved = addresses.countByCustomerId(customerId);
        if (saved >= MAX_ADDRESSES) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "You can save up to " + MAX_ADDRESSES + " addresses. Please remove one to add another.");
        }
        boolean makeDefault = saved == 0 || Boolean.TRUE.equals(request.makeDefault());
        if (makeDefault) addresses.clearDefault(customerId);
        CustomerAddress address = new CustomerAddress(customerId);
        apply(address, request);
        address.setDefaultAddress(makeDefault);
        return response(addresses.saveAndFlush(address));
    }

    /** makeDefault false never removes the default flag: there is always one default while addresses exist. */
    @Transactional
    public AddressResponse update(String subject, UUID addressId, AddressRequest request) {
        UUID customerId = lockAddressBook(subject);
        CustomerAddress address = find(addressId, customerId);
        apply(address, request);
        if (Boolean.TRUE.equals(request.makeDefault()) && !address.isDefaultAddress()) {
            addresses.clearDefault(customerId);
            address.setDefaultAddress(true);
        }
        return response(addresses.saveAndFlush(address));
    }

    /** Removing the default address passes the default to the oldest address left. */
    @Transactional
    public void delete(String subject, UUID addressId) {
        UUID customerId = lockAddressBook(subject);
        CustomerAddress address = find(addressId, customerId);
        addresses.delete(address);
        addresses.flush();
        if (address.isDefaultAddress()) {
            addresses.findFirstByCustomerIdOrderByCreatedAtAsc(customerId).ifPresent(next -> next.setDefaultAddress(true));
        }
    }

    /**
     * Locks the customer's profile row for the rest of the transaction, so two requests at once
     * (two tabs, a double click) can't both slip past the address limit or both become the default.
     */
    private UUID lockAddressBook(String subject) {
        UUID customerId = profiles.currentUser(subject).id();
        jdbcTemplate.queryForObject("select id from public.profiles where id = ? for update", UUID.class, customerId);
        return customerId;
    }

    private CustomerAddress find(UUID addressId, UUID customerId) {
        // Someone else's address looks exactly like one that doesn't exist.
        return addresses.findByIdAndCustomerId(addressId, customerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Address not found."));
    }

    private static void apply(CustomerAddress address, AddressRequest request) {
        address.setFullName(request.fullName().trim());
        address.setPhone(request.phone().trim());
        address.setAddressLine(request.addressLine().trim());
        address.setCity(request.city().trim());
        address.setState(request.state().trim());
        address.setPostalCode(request.postalCode().trim());
    }

    static AddressResponse response(CustomerAddress address) {
        return new AddressResponse(address.getId(), address.getFullName(), address.getPhone(), address.getAddressLine(),
                address.getCity(), address.getState(), address.getPostalCode(), address.isDefaultAddress());
    }
}
