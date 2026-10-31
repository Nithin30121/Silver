package com.silvestoluxe.api.order;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface CustomerOrderRepository extends JpaRepository<CustomerOrder, UUID>, JpaSpecificationExecutor<CustomerOrder> {
    Page<CustomerOrder> findByCustomerIdOrderByCreatedAtDesc(UUID customerId, Pageable pageable);

    boolean existsByCustomerIdAndStatusIn(UUID customerId, Collection<OrderStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select customerOrder from CustomerOrder customerOrder where customerOrder.id = :id")
    Optional<CustomerOrder> findByIdForUpdate(@Param("id") UUID id);

    @Query("""
            select customerOrder.id from CustomerOrder customerOrder
            where customerOrder.status = com.silvestoluxe.api.order.OrderStatus.PENDING_PAYMENT
              and customerOrder.paymentStatus in (com.silvestoluxe.api.order.PaymentStatus.PENDING, com.silvestoluxe.api.order.PaymentStatus.FAILED)
              and customerOrder.paymentDueAt < :now
            """)
    List<UUID> findOverduePayments(@Param("now") Instant now);
}
