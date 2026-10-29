package com.silvestoluxe.api.account;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface CustomerAddressRepository extends JpaRepository<CustomerAddress, UUID> {
    /** The default address first, then the rest in the order they were saved. */
    List<CustomerAddress> findByCustomerIdOrderByDefaultAddressDescCreatedAtAsc(UUID customerId);

    Optional<CustomerAddress> findByIdAndCustomerId(UUID id, UUID customerId);

    Optional<CustomerAddress> findFirstByCustomerIdOrderByCreatedAtAsc(UUID customerId);

    long countByCustomerId(UUID customerId);

    /** Runs before a new default is saved, since the database allows only one default per customer. */
    @Modifying(flushAutomatically = true)
    @Query("update CustomerAddress address set address.defaultAddress = false "
            + "where address.customerId = :customerId and address.defaultAddress = true")
    int clearDefault(@Param("customerId") UUID customerId);
}
