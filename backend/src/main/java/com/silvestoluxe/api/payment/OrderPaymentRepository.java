package com.silvestoluxe.api.payment;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface OrderPaymentRepository extends JpaRepository<OrderPayment, UUID> {
    List<OrderPayment> findByOrderIdOrderByCreatedAtDesc(UUID orderId);

    Optional<OrderPayment> findByRazorpayOrderId(String razorpayOrderId);

    boolean existsByOrderIdAndStatus(UUID orderId, OrderPaymentStatus status);

    /** Locks the attempt first and the order second everywhere, so a webhook and the browser take turns. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select payment from OrderPayment payment where payment.razorpayOrderId = :razorpayOrderId")
    Optional<OrderPayment> lockByRazorpayOrderId(@Param("razorpayOrderId") String razorpayOrderId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select payment from OrderPayment payment where payment.razorpayPaymentId = :paymentId")
    Optional<OrderPayment> lockByRazorpayPaymentId(@Param("paymentId") String paymentId);
}
