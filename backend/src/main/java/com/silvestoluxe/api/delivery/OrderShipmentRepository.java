package com.silvestoluxe.api.delivery;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface OrderShipmentRepository extends JpaRepository<OrderShipment, UUID> {
    List<OrderShipment> findByOrderIdOrderByCreatedAtDesc(UUID orderId);

    Optional<OrderShipment> findByIdAndOrderId(UUID id, UUID orderId);

    boolean existsByOrderIdAndStateNot(UUID orderId, ShipmentState state);

    long countByOrderId(UUID orderId);

    /** Parcels that can still move, the longest unchecked first, so every one gets its turn. */
    @Query("select shipment from OrderShipment shipment where shipment.state in :states "
            + "order by shipment.checkedAt asc nulls first, shipment.createdAt asc")
    List<OrderShipment> findToCheck(@Param("states") Collection<ShipmentState> states, Pageable pageable);
}
