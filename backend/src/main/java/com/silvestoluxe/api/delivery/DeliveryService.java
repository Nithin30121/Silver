package com.silvestoluxe.api.delivery;

import static com.silvestoluxe.api.delivery.DeliveryDtos.*;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.silvestoluxe.api.order.OrderDtos.Parcel;
import com.silvestoluxe.api.order.OrderDtos.ParcelItem;
import com.silvestoluxe.api.order.OrderService;
import com.silvestoluxe.api.order.OrderStatus;
import com.silvestoluxe.api.order.PaymentMethod;
import com.silvestoluxe.api.order.PaymentStatus;
import com.silvestoluxe.api.product.Product;
import com.silvestoluxe.api.product.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Books parcels with Delhivery and follows them. Delhivery's scans move the order along: collected means shipped and
 * delivered means delivered, with the usual customer emails. A parcel coming back is left for the owner to close.
 * Calls to Delhivery happen outside database transactions, so a slow reply never holds an order locked.
 */
@Service
public class DeliveryService {
    private static final Logger log = LoggerFactory.getLogger(DeliveryService.class);
    static final String CARRIER = "Delhivery";
    /** Parcels per tracking call; Delhivery takes several tracking numbers in one request. */
    static final int TRACK_BATCH = 25;
    static final int CHECKS_PER_ROUND = 100;
    private static final Duration PIN_MEMORY = Duration.ofHours(12);
    private static final int PIN_MEMORY_SIZE = 5_000;
    private static final Collection<ShipmentState> MOVING = EnumSet.of(ShipmentState.BOOKED, ShipmentState.IN_TRANSIT, ShipmentState.RETURNING);

    private final DelhiveryClient delhivery;
    private final OrderService orders;
    private final OrderShipmentRepository shipments;
    private final ProductRepository products;
    private final int packagingGrams;
    private final int defaultWeightGrams;
    private final Clock clock;
    private final Map<String, RememberedCheck> pinChecks = new ConcurrentHashMap<>();

    @Autowired
    public DeliveryService(DelhiveryClient delhivery, OrderService orders, OrderShipmentRepository shipments, ProductRepository products,
                           @Value("${app.delhivery.packaging-grams:100}") int packagingGrams,
                           @Value("${app.delhivery.default-weight-grams:250}") int defaultWeightGrams) {
        this(delhivery, orders, shipments, products, packagingGrams, defaultWeightGrams, Clock.systemUTC());
    }

    DeliveryService(DelhiveryClient delhivery, OrderService orders, OrderShipmentRepository shipments, ProductRepository products,
                    int packagingGrams, int defaultWeightGrams, Clock clock) {
        this.delhivery = delhivery;
        this.orders = orders;
        this.shipments = shipments;
        this.products = products;
        this.packagingGrams = Math.max(0, packagingGrams);
        this.defaultWeightGrams = Math.max(1, defaultWeightGrams);
        this.clock = clock;
    }

    /** Whether the order has a Delhivery booking that wasn't cancelled: a parcel that exists, or existed, at Delhivery. */
    public boolean hasBooking(UUID orderId) { return shipments.existsByOrderIdAndStateNot(orderId, ShipmentState.CANCELLED); }

    public OrderShipments forOrder(UUID orderId) {
        Parcel parcel = orders.parcel(orderId);
        return new OrderShipments(delhivery.isEnabled(), suggestedWeight(parcel.items()),
                shipments.findByOrderIdOrderByCreatedAtDesc(orderId).stream().map(DeliveryService::row).toList());
    }

    /**
     * Books the order's parcel. A paid order goes as prepaid; an unpaid cash-on-delivery order has its total collected
     * at the door. Anything else isn't ready to leave the shop.
     */
    public ShipmentRow book(UUID orderId, int weightGrams) {
        if (!delhivery.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Delhivery isn't set up yet. Add DELHIVERY_API_TOKEN and DELHIVERY_PICKUP_LOCATION on Render.");
        }
        Parcel parcel = orders.parcel(orderId);
        if (parcel.status() != OrderStatus.CONFIRMED && parcel.status() != OrderStatus.PROCESSING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, parcel.status() == OrderStatus.PENDING_PAYMENT
                    ? "This order isn't paid or confirmed yet, so it can't be booked."
                    : "Only confirmed orders that haven't shipped can be booked with Delhivery.");
        }
        if (shipments.existsByOrderIdAndStateNot(orderId, ShipmentState.CANCELLED)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This order already has a Delhivery booking.");
        }
        boolean cashOnDelivery;
        if (parcel.paymentStatus() == PaymentStatus.PAID) cashOnDelivery = false;
        else if (parcel.paymentMethod() == PaymentMethod.COD && parcel.paymentStatus() == PaymentStatus.PENDING) cashOnDelivery = true;
        else throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This order isn't paid yet. Mark it as paid first; only cash-on-delivery orders can go unpaid.");
        String pin = parcel.postalCode().replaceAll("\\s", "");
        if (!pin.matches("[1-9][0-9]{5}")) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The delivery PIN code must be 6 digits. Correct it with the customer first.");
        }
        String phone = phoneDigits(parcel.phone());
        if (phone.length() != 10) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Delhivery needs a 10-digit phone number for the customer.");
        }

        // A booking cancelled earlier used the plain order number, and Delhivery wants each reference only once.
        long earlier = shipments.countByOrderId(orderId);
        String reference = earlier == 0 ? parcel.orderNumber() : parcel.orderNumber() + "-" + (earlier + 1);
        int quantity = parcel.items().stream().mapToInt(ParcelItem::quantity).sum();
        String waybill;
        try {
            waybill = delhivery.book(new DelhiveryClient.Parcel(reference, parcel.fullName(), phone, parcel.address(), parcel.city(),
                    parcel.state(), pin, cashOnDelivery, cashOnDelivery ? parcel.totalAmount() : BigDecimal.ZERO, parcel.totalAmount(),
                    description(parcel.items()), Math.max(1, quantity), weightGrams));
        } catch (DelhiveryException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, exception.getMessage());
        }

        OrderShipment shipment;
        try {
            shipment = shipments.saveAndFlush(new OrderShipment(orderId, waybill, reference,
                    cashOnDelivery ? OrderShipment.Payment.COD : OrderShipment.Payment.PREPAID,
                    cashOnDelivery ? parcel.totalAmount() : BigDecimal.ZERO, weightGrams));
        } catch (DataIntegrityViolationException exception) {
            // Two bookings at once: Delhivery has both, but the shop keeps only the first.
            log.error("Order {} was booked with Delhivery twice; cancel tracking number {} in Delhivery One.", parcel.orderNumber(), waybill);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This order was booked twice at the same moment. Cancel tracking number "
                    + waybill + " in Delhivery One, then refresh.");
        }
        orders.recordCourierBooking(orderId, CARRIER, waybill, DelhiveryClient.trackingUrl(waybill));
        return row(shipment);
    }

    /** Asks Delhivery about one parcel now, instead of waiting for the regular check. */
    public ShipmentRow refresh(UUID orderId, UUID shipmentId) {
        OrderShipment shipment = find(orderId, shipmentId);
        if (!shipment.getState().isMoving()) return row(shipment);
        try {
            List<DelhiveryClient.Tracking> scans = delhivery.track(List.of(shipment.getWaybill()));
            if (scans.isEmpty()) {
                shipment.markChecked(clock.instant());
                return row(shipments.save(shipment));
            }
            return row(apply(shipment, scans.get(0)));
        } catch (DelhiveryException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, exception.getMessage());
        }
    }

    /** Cancels a booking the courier hasn't collected yet. The order stays, ready to be booked again or cancelled. */
    public ShipmentRow cancel(UUID orderId, UUID shipmentId) {
        OrderShipment shipment = find(orderId, shipmentId);
        if (shipment.getState() == ShipmentState.CANCELLED) return row(shipment);
        if (shipment.getState() != ShipmentState.BOOKED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Delhivery has already collected this parcel, so the booking can't be cancelled from here.");
        }
        try {
            delhivery.cancel(shipment.getWaybill());
        } catch (DelhiveryException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, exception.getMessage());
        }
        shipment.cancel(clock.instant());
        OrderShipment saved = shipments.save(shipment);
        orders.clearCourierBooking(orderId, shipment.getWaybill(),
                "Delhivery booking " + shipment.getWaybill() + " cancelled.");
        return row(saved);
    }

    /** Closes the order of a parcel Delhivery brought back, and puts its pieces back in stock. */
    public void closeReturned(UUID orderId, UUID shipmentId, UUID actorId) {
        OrderShipment shipment = find(orderId, shipmentId);
        if (shipment.getState() != ShipmentState.RETURNED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only a parcel Delhivery has brought back to the shop can be closed this way.");
        }
        orders.cancelReturnedByCourier(orderId, actorId);
    }

    /** Whether Delhivery delivers to a PIN code. Answers are remembered for a while, so checkout doesn't ask every time. */
    public DeliveryCheck check(String pin) {
        String code = pin == null ? "" : pin.replaceAll("\\s", "");
        if (!code.matches("[1-9][0-9]{5}")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a 6-digit PIN code.");
        if (!delhivery.isEnabled()) return new DeliveryCheck(false, false, false);
        Instant now = clock.instant();
        RememberedCheck remembered = pinChecks.get(code);
        if (remembered != null && remembered.until().isAfter(now)) return remembered.check();
        try {
            DelhiveryClient.Serviceability answer = delhivery.serviceability(code);
            DeliveryCheck check = new DeliveryCheck(true, answer.serviceable(), answer.cashOnDelivery());
            if (pinChecks.size() >= PIN_MEMORY_SIZE) pinChecks.clear();
            pinChecks.put(code, new RememberedCheck(check, now.plus(PIN_MEMORY)));
            return check;
        } catch (DelhiveryException exception) {
            return new DeliveryCheck(false, false, false);
        }
    }

    /** Asks Delhivery about the parcels that can still move, the longest unchecked first. */
    public void checkMovingParcels() {
        if (!delhivery.isEnabled()) return;
        List<OrderShipment> due = shipments.findToCheck(MOVING, PageRequest.of(0, CHECKS_PER_ROUND));
        for (int start = 0; start < due.size(); start += TRACK_BATCH) {
            List<OrderShipment> batch = due.subList(start, Math.min(due.size(), start + TRACK_BATCH));
            Map<String, DelhiveryClient.Tracking> scans;
            try {
                scans = delhivery.track(batch.stream().map(OrderShipment::getWaybill).toList()).stream()
                        .collect(Collectors.toMap(DelhiveryClient.Tracking::waybill, Function.identity(), (first, second) -> first));
            } catch (DelhiveryException exception) {
                log.warn("Could not check parcels with Delhivery: {}", exception.getMessage());
                return;
            }
            for (OrderShipment shipment : batch) {
                try {
                    DelhiveryClient.Tracking scan = scans.get(shipment.getWaybill());
                    if (scan == null) {
                        shipment.markChecked(clock.instant());
                        shipments.save(shipment);
                    } else {
                        apply(shipment, scan);
                    }
                } catch (RuntimeException exception) {
                    log.warn("Could not update parcel {} from Delhivery's scan.", shipment.getWaybill(), exception);
                }
            }
        }
    }

    /** Keeps the scan and moves the order along when the parcel's state changes. */
    private OrderShipment apply(OrderShipment shipment, DelhiveryClient.Tracking scan) {
        ShipmentState before = shipment.getState();
        ShipmentState after = ShipmentState.from(scan.status(), scan.statusType(), before);
        shipment.recordScan(scan.status(), scan.statusType(), scan.location(), scan.at(), after, clock.instant());
        OrderShipment saved = shipments.save(shipment);
        if (after == before) return saved;
        UUID orderId = shipment.getOrderId();
        String where = scan.location() == null || scan.location().isBlank() ? "" : " (" + scan.location().trim() + ")";
        switch (after) {
            case IN_TRANSIT -> orders.markPickedUpByCourier(orderId, "Collected by Delhivery" + where + ".");
            case DELIVERED -> orders.markDeliveredByCourier(orderId, "Delivered by Delhivery" + where + ".");
            case RETURNING -> orders.addNote(orderId, "Delhivery is bringing the parcel back to the shop: " + Objects.toString(scan.status(), "return") + where + ".");
            case RETURNED -> orders.addNote(orderId, "Delhivery brought the parcel back to the shop" + where + ".");
            case LOST -> orders.addNote(orderId, "Delhivery reported the parcel lost. Raise a claim in Delhivery One.");
            case CANCELLED -> orders.clearCourierBooking(orderId, shipment.getWaybill(), "Delhivery cancelled booking " + shipment.getWaybill() + ".");
            case BOOKED -> { }
        }
        return saved;
    }

    /** The pieces' recorded weights plus the box, or a usual parcel weight when a piece has none. */
    int suggestedWeight(List<ParcelItem> items) {
        List<UUID> ids = items.stream().map(ParcelItem::productId).filter(Objects::nonNull).distinct().toList();
        Map<UUID, BigDecimal> weights = products.findAllById(ids).stream().filter(product -> product.getWeightGrams() != null)
                .collect(Collectors.toMap(Product::getId, Product::getWeightGrams));
        BigDecimal total = BigDecimal.ZERO;
        for (ParcelItem item : items) {
            BigDecimal weight = item.productId() == null ? null : weights.get(item.productId());
            if (weight == null) return defaultWeightGrams;
            total = total.add(weight.multiply(BigDecimal.valueOf(item.quantity())));
        }
        return Math.max(1, total.setScale(0, java.math.RoundingMode.CEILING).intValue() + packagingGrams);
    }

    /** Delhivery wants the 10-digit mobile number, without +91 or a leading 0. */
    static String phoneDigits(String phone) {
        String digits = phone == null ? "" : phone.replaceAll("\\D", "");
        if (digits.length() == 12 && digits.startsWith("91")) return digits.substring(2);
        if (digits.length() == 11 && digits.startsWith("0")) return digits.substring(1);
        return digits;
    }

    static String description(List<ParcelItem> items) {
        String names = items.stream().map(item -> item.quantity() > 1 ? item.name() + " x" + item.quantity() : item.name())
                .collect(Collectors.joining(", "));
        String text = "Silver jewellery: " + names;
        return text.length() > 200 ? text.substring(0, 197) + "..." : text;
    }

    private OrderShipment find(UUID orderId, UUID shipmentId) {
        return shipments.findByIdAndOrderId(shipmentId, orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Delhivery booking not found."));
    }

    private static ShipmentRow row(OrderShipment shipment) {
        return new ShipmentRow(shipment.getId(), shipment.getWaybill(), shipment.getState(), shipment.getPaymentMode(),
                shipment.getCodAmount(), shipment.getWeightGrams(), shipment.getCourierStatus(), shipment.getCourierLocation(),
                shipment.getCourierStatusAt(), DelhiveryClient.trackingUrl(shipment.getWaybill()), shipment.getCreatedAt(),
                shipment.getCheckedAt(), shipment.getCancelledAt());
    }

    private record RememberedCheck(DeliveryCheck check, Instant until) { }
}
