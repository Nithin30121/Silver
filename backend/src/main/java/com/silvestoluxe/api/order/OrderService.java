package com.silvestoluxe.api.order;

import static com.silvestoluxe.api.order.OrderDtos.*;

import java.math.BigDecimal;
import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.silvestoluxe.api.account.AccountProfileService;
import com.silvestoluxe.api.common.LikePattern;
import com.silvestoluxe.api.notification.OrderEmail;
import com.silvestoluxe.api.payment.RazorpayClient;
import com.silvestoluxe.api.product.Product;
import com.silvestoluxe.api.product.ProductRepository;
import com.silvestoluxe.api.product.StockLedger;
import com.silvestoluxe.api.product.StockMovementReason;
import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Creates immutable purchase snapshots and adjusts stock together in one database transaction. */
@Service
@Transactional(readOnly = true)
public class OrderService {
    static final int MAX_QUERY_LENGTH = 100;
    static final int EXPORT_LIMIT = 10_000;
    /** A customer can cancel an order themselves until it leaves the shop. */
    static final Set<OrderStatus> CUSTOMER_CANCELLABLE = EnumSet.of(OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMED, OrderStatus.PROCESSING);
    /** Orders that are still on their way, which keep a customer from deleting their account. */
    static final Set<OrderStatus> IN_PROGRESS = EnumSet.of(OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMED,
            OrderStatus.PROCESSING, OrderStatus.SHIPPED);
    /** Without Razorpay the shop arranges these by hand; with it, customers pay online or on delivery. */
    private static final Set<PaymentMethod> OFFLINE_ONLY = EnumSet.of(PaymentMethod.UPI, PaymentMethod.CARD);

    private final CustomerOrderRepository orders;
    private final ProductRepository products;
    private final AccountProfileService profiles;
    private final EntityManager entityManager;
    private final StockLedger stock;
    private final ApplicationEventPublisher events;
    private final RazorpayClient razorpay;
    private final Duration payWithin;
    private final Clock clock;

    @Autowired
    public OrderService(CustomerOrderRepository orders, ProductRepository products, AccountProfileService profiles,
                        EntityManager entityManager, StockLedger stock, ApplicationEventPublisher events, RazorpayClient razorpay,
                        @Value("${app.razorpay.pay-within:PT30M}") Duration payWithin) {
        this(orders, products, profiles, entityManager, stock, events, razorpay, payWithin, Clock.systemUTC());
    }

    OrderService(CustomerOrderRepository orders, ProductRepository products, AccountProfileService profiles,
                 EntityManager entityManager, StockLedger stock, ApplicationEventPublisher events, RazorpayClient razorpay,
                 Duration payWithin, Clock clock) {
        this.orders = orders;
        this.products = products;
        this.profiles = profiles;
        this.entityManager = entityManager;
        this.stock = stock;
        this.events = events;
        this.razorpay = razorpay;
        this.payWithin = payWithin;
        this.clock = clock;
    }

    @Transactional
    public Response checkout(String subject, CheckoutRequest request) {
        UUID customerId = profiles.currentUser(subject).id();
        checkPaymentMethod(request.paymentMethod());
        Map<UUID, Integer> requested = mergeQuantities(request.items());
        List<Product> lockedProducts = requested.keySet().stream()
                .sorted(Comparator.comparing(UUID::toString))
                .map(this::findProductForCheckout)
                .toList();

        BigDecimal subtotal = BigDecimal.ZERO;
        for (Product product : lockedProducts) {
            int quantity = requested.get(product.getId());
            if (!product.isActive()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, product.getName() + " is no longer available.");
            }
            if (product.getStockQuantity() < quantity) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, product.getName() + " does not have enough stock available.");
            }
            subtotal = subtotal.add(product.getPrice().multiply(BigDecimal.valueOf(quantity)));
        }

        CustomerOrder order = new CustomerOrder(customerId, request.paymentMethod(), subtotal,
                clean(request.shippingFullName()), clean(request.shippingEmail()), clean(request.shippingPhone()),
                clean(request.shippingAddress()), clean(request.shippingCity()), clean(request.shippingState()),
                clean(request.shippingPostalCode()));
        order.recordStatus(OrderStatus.PENDING_PAYMENT, "Order created; payment is pending.");
        boolean paysOnline = request.paymentMethod() == PaymentMethod.ONLINE;
        if (paysOnline) order.setPaymentDueAt(clock.instant().plus(payWithin));
        for (Product product : lockedProducts) {
            int quantity = requested.get(product.getId());
            order.addItem(new OrderItem(order, product.getId(), product.getName(), product.getSku(), product.getPrice(), quantity));
            product.setStockQuantity(product.getStockQuantity() - quantity);
        }
        CustomerOrder saved = orders.saveAndFlush(order);
        // The readable order number is generated by PostgreSQL's default expression.
        entityManager.refresh(saved);
        for (Product product : lockedProducts) {
            stock.record(product, -requested.get(product.getId()), StockMovementReason.SALE, saved.getId(), customerId);
        }
        // An online order is confirmed by its payment, and that is when the customer hears about it.
        if (!paysOnline) events.publishEvent(email(saved, OrderEmail.Kind.PLACED));
        return response(saved);
    }

    private void checkPaymentMethod(PaymentMethod method) {
        if (method == PaymentMethod.ONLINE && !razorpay.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Online payment isn't available right now. Please choose another way to pay.");
        }
        if (OFFLINE_ONLY.contains(method) && razorpay.isEnabled()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please choose online payment or cash on delivery.");
        }
    }

    public Page<Response> history(String subject, Pageable pageable) {
        return orders.findByCustomerIdOrderByCreatedAtDesc(profiles.currentUser(subject).id(), pageable).map(this::response);
    }

    public Response customerOrder(String subject, UUID orderId) {
        UUID customerId = profiles.currentUser(subject).id();
        CustomerOrder order = find(orderId);
        if (!customerId.equals(order.getCustomerId())) throw notFound();
        return response(order);
    }

    /**
     * Cancels a customer's own order before it ships and returns its pieces to stock. A paid order
     * needs a refund, which the shop arranges, so customers are asked to get in touch instead.
     */
    @Transactional
    public Response cancelByCustomer(String subject, UUID orderId) {
        UUID customerId = profiles.currentUser(subject).id();
        CustomerOrder order = orders.findByIdForUpdate(orderId).orElseThrow(this::notFound);
        if (!customerId.equals(order.getCustomerId())) throw notFound();
        // A second click, or a second tab, finds the order already cancelled: nothing more to do.
        if (order.getStatus() == OrderStatus.CANCELLED) return response(order);
        if (!CUSTOMER_CANCELLABLE.contains(order.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This order has already been shipped, so it can no longer be cancelled online. Please contact us for help.");
        }
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This order has been paid, so please contact us to cancel it and arrange your refund.");
        }
        if (isBookedWithCourier(order)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Your order is packed and booked with our courier, so please contact us to cancel it.");
        }
        restoreStock(order, customerId);
        order.setStatus(OrderStatus.CANCELLED);
        order.recordStatus(OrderStatus.CANCELLED, "Cancelled by the customer.");
        events.publishEvent(email(order, OrderEmail.Kind.CANCELLED));
        return response(order);
    }

    /** The customer's own order, provided it can still be paid online. */
    public PaymentTarget paymentTarget(String subject, UUID orderId) {
        UUID customerId = profiles.currentUser(subject).id();
        CustomerOrder order = find(orderId);
        if (!customerId.equals(order.getCustomerId())) throw notFound();
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This order has already been paid.");
        }
        if (!canPay(order)) throw new ResponseStatusException(HttpStatus.CONFLICT, "This order can no longer be paid online.");
        return new PaymentTarget(order.getId(), order.getOrderNumber(), order.getTotalAmount(), order.getShippingFullName(),
                order.getShippingEmail(), order.getShippingPhone());
    }

    private static boolean canPay(CustomerOrder order) {
        return order.getPaymentMethod() == PaymentMethod.ONLINE && order.getStatus() == OrderStatus.PENDING_PAYMENT
                && (order.getPaymentStatus() == PaymentStatus.PENDING || order.getPaymentStatus() == PaymentStatus.FAILED);
    }

    /** A customer starting to pay gets the full time again, so their order isn't cancelled mid-payment. */
    @Transactional
    public void extendPaymentTime(UUID orderId) {
        CustomerOrder order = orders.findByIdForUpdate(orderId).orElseThrow(this::notFound);
        if (canPay(order)) order.setPaymentDueAt(clock.instant().plus(payWithin));
    }

    /**
     * Records a confirmed online payment. Returns false when the order can't take it, because it was
     * cancelled or has been paid already; the money then needs refunding.
     */
    @Transactional
    public boolean applyPayment(UUID orderId, PaymentMethod method) {
        CustomerOrder order = orders.findByIdForUpdate(orderId).orElseThrow(this::notFound);
        if (order.getStatus() == OrderStatus.CANCELLED || order.getPaymentStatus() == PaymentStatus.PAID
                || order.getPaymentStatus() == PaymentStatus.REFUNDED) return false;
        order.setPaymentStatus(PaymentStatus.PAID);
        order.setPaymentMethod(method);
        order.setPaymentDueAt(null);
        if (order.getStatus() == OrderStatus.PENDING_PAYMENT) {
            order.setStatus(OrderStatus.CONFIRMED);
            order.recordStatus(OrderStatus.CONFIRMED, "Paid online; order confirmed.");
            events.publishEvent(email(order, OrderEmail.Kind.CONFIRMED));
        } else {
            order.recordStatus(order.getStatus(), "Paid online.");
        }
        return true;
    }

    /** A failed attempt changes nothing else: the customer can try again until the payment time runs out. */
    @Transactional
    public void markPaymentFailed(UUID orderId) {
        CustomerOrder order = orders.findByIdForUpdate(orderId).orElseThrow(this::notFound);
        if (order.getPaymentStatus() == PaymentStatus.PENDING) order.setPaymentStatus(PaymentStatus.FAILED);
    }

    /** A full refund of the payment that paid for this order. */
    @Transactional
    public void markRefunded(UUID orderId) {
        CustomerOrder order = orders.findByIdForUpdate(orderId).orElseThrow(this::notFound);
        if (order.getPaymentStatus() == PaymentStatus.PAID) order.setPaymentStatus(PaymentStatus.REFUNDED);
    }

    /** Adds a line to the order's history without changing its status. */
    @Transactional
    public void addNote(UUID orderId, String note) {
        CustomerOrder order = orders.findByIdForUpdate(orderId).orElseThrow(this::notFound);
        order.recordStatus(order.getStatus(), note);
    }

    public String orderNumber(UUID orderId) { return find(orderId).getOrderNumber(); }

    public List<UUID> overduePayments() { return orders.findOverduePayments(clock.instant()); }

    /** Cancels an online order nobody paid for and returns its pieces, unless it was paid or given more time. */
    @Transactional
    public void expireUnpaid(UUID orderId) {
        CustomerOrder order = orders.findByIdForUpdate(orderId).orElseThrow(this::notFound);
        if (!canPay(order) || order.getPaymentDueAt() == null || order.getPaymentDueAt().isAfter(clock.instant())) return;
        restoreStock(order, order.getCustomerId());
        order.setStatus(OrderStatus.CANCELLED);
        order.setPaymentDueAt(null);
        order.recordStatus(OrderStatus.CANCELLED, "Cancelled automatically: the payment wasn't completed in time.");
    }

    /** Whether any of this customer's orders is still on its way. */
    public boolean hasOrdersInProgress(UUID customerId) {
        return orders.existsByCustomerIdAndStatusIn(customerId, IN_PROGRESS);
    }

    /** Admin order list: the query matches part of an order number, customer name, email or phone. */
    public Page<Response> search(String query, OrderStatus status, PlacedBetween placed, Pageable pageable) {
        return orders.findAll(matching(query, status, placed), pageable).map(this::response);
    }

    /** Every matching order, newest first, for spreadsheet downloads. */
    public List<Response> export(String query, OrderStatus status, PlacedBetween placed) {
        return orders.findAll(matching(query, status, placed), PageRequest.of(0, EXPORT_LIMIT, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(this::response).getContent();
    }

    /** One customer's orders, newest first, for the admin customer directory. */
    public Page<Response> forCustomer(UUID customerId, Pageable pageable) {
        return orders.findByCustomerIdOrderByCreatedAtDesc(customerId, pageable).map(this::response);
    }

    @Transactional
    public Response updateStatus(UUID orderId, StatusUpdate request, UUID actorId) {
        CustomerOrder order = orders.findByIdForUpdate(orderId).orElseThrow(this::notFound);
        OrderStatus previous = order.getStatus();
        validateTransition(previous, request.status());
        if (request.status() == OrderStatus.CANCELLED && isBookedWithCourier(order)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This order is booked with Delhivery. Cancel the booking in its Delivery section first.");
        }
        if (previous != OrderStatus.CANCELLED && request.status() == OrderStatus.CANCELLED) restoreStock(order, actorId);
        applyTracking(order, request);
        order.setStatus(request.status());
        order.setPaymentStatus(request.paymentStatus());
        order.recordStatus(request.status(), request.note() == null || request.note().isBlank()
                ? "Order status updated." : request.note().trim());
        OrderEmail.Kind kind = emailFor(request.status());
        boolean notify = request.notifyCustomer() == null || request.notifyCustomer();
        if (notify && kind != null && previous != request.status()) events.publishEvent(email(order, kind));
        return response(order);
    }

    /** Holds the order's row until the caller's transaction ends, so nothing changes it while it is checked. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void lock(UUID orderId) {
        orders.findByIdForUpdate(orderId).orElseThrow(this::notFound);
    }

    /**
     * Removes an order that never took money: one waiting for payment, whose pieces go back to stock, or
     * one already cancelled, whose pieces went back then. Its items and history go with it; stock
     * movements stay, no longer linked to it. Payment and courier records are checked by the caller.
     */
    @Transactional
    public String deleteUnpaid(UUID orderId, UUID actorId) {
        CustomerOrder order = orders.findByIdForUpdate(orderId).orElseThrow(this::notFound);
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT && order.getStatus() != OrderStatus.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only orders waiting for payment or already cancelled can be deleted. Cancel this order first.");
        }
        if (order.getPaymentStatus() == PaymentStatus.PAID || order.getPaymentStatus() == PaymentStatus.REFUNDED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Money was taken for this order, so it's kept for your records.");
        }
        if (order.getStatus() == OrderStatus.PENDING_PAYMENT) restoreStock(order, actorId);
        orders.delete(order);
        return order.getOrderNumber();
    }

    /**
     * Tracking details on an order that hasn't shipped can only come from a courier booking (by hand they're added when
     * marking it shipped), so such an order is packed and waiting for the courier.
     */
    private static boolean isBookedWithCourier(CustomerOrder order) {
        return order.getTrackingNumber() != null && (order.getStatus() == OrderStatus.CONFIRMED || order.getStatus() == OrderStatus.PROCESSING);
    }

    public Parcel parcel(UUID orderId) {
        CustomerOrder order = find(orderId);
        return new Parcel(order.getId(), order.getOrderNumber(), order.getStatus(), order.getPaymentStatus(), order.getPaymentMethod(),
                order.getTotalAmount(), order.getShippingFullName(), order.getShippingPhone(), order.getShippingAddress(),
                order.getShippingCity(), order.getShippingState(), order.getShippingPostalCode(),
                order.getItems().stream().map(item -> new ParcelItem(item.getProductId(), item.getProductName(), item.getQuantity())).toList());
    }

    /** A parcel booked with a courier: the order is now being packed, and the customer can see its tracking number. */
    @Transactional
    public void recordCourierBooking(UUID orderId, String carrier, String trackingNumber, String trackingUrl) {
        CustomerOrder order = orders.findByIdForUpdate(orderId).orElseThrow(this::notFound);
        if (order.getStatus() == OrderStatus.CONFIRMED) order.setStatus(OrderStatus.PROCESSING);
        order.setTracking(carrier, trackingNumber, trackingUrl);
        order.recordStatus(order.getStatus(), "Booked with " + carrier + ". Tracking number " + trackingNumber + ".");
    }

    /** A courier booking that was cancelled; the order goes back to waiting to be booked or cancelled. */
    @Transactional
    public void clearCourierBooking(UUID orderId, String trackingNumber, String note) {
        CustomerOrder order = orders.findByIdForUpdate(orderId).orElseThrow(this::notFound);
        if (trackingNumber.equals(order.getTrackingNumber()) && order.getStatus() != OrderStatus.SHIPPED
                && order.getStatus() != OrderStatus.DELIVERED) {
            order.setTracking(null, null, null);
        }
        order.recordStatus(order.getStatus(), note);
    }

    /** The courier collected the parcel. An order already marked shipped by hand is left as it is. */
    @Transactional
    public void markPickedUpByCourier(UUID orderId, String note) {
        CustomerOrder order = orders.findByIdForUpdate(orderId).orElseThrow(this::notFound);
        if (order.getStatus() != OrderStatus.CONFIRMED && order.getStatus() != OrderStatus.PROCESSING) return;
        order.setStatus(OrderStatus.SHIPPED);
        order.recordStatus(OrderStatus.SHIPPED, note);
        events.publishEvent(email(order, OrderEmail.Kind.SHIPPED));
    }

    /** The courier delivered the parcel. A parcel delivered before its pickup was noticed goes through shipped first, quietly. */
    @Transactional
    public void markDeliveredByCourier(UUID orderId, String note) {
        CustomerOrder order = orders.findByIdForUpdate(orderId).orElseThrow(this::notFound);
        if (order.getStatus() == OrderStatus.CONFIRMED || order.getStatus() == OrderStatus.PROCESSING) {
            order.setStatus(OrderStatus.SHIPPED);
            order.recordStatus(OrderStatus.SHIPPED, "Picked up by the courier.");
        }
        if (order.getStatus() != OrderStatus.SHIPPED) return;
        order.setStatus(OrderStatus.DELIVERED);
        order.recordStatus(OrderStatus.DELIVERED, note);
        events.publishEvent(email(order, OrderEmail.Kind.DELIVERED));
    }

    /**
     * Closes an order whose parcel the courier brought back to the shop, for example one the customer refused, and puts
     * its pieces back on sale. The shop speaks to the customer itself, since a paid order also needs a refund.
     */
    @Transactional
    public void cancelReturnedByCourier(UUID orderId, UUID actorId) {
        CustomerOrder order = orders.findByIdForUpdate(orderId).orElseThrow(this::notFound);
        if (order.getStatus() == OrderStatus.CANCELLED) return;
        if (order.getStatus() == OrderStatus.DELIVERED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This order was delivered, so it can't be closed as returned.");
        }
        restoreStock(order, actorId);
        order.setStatus(OrderStatus.CANCELLED);
        order.recordStatus(OrderStatus.CANCELLED, "The courier returned the parcel to the shop; its pieces are back in stock.");
    }

    /** Courier details belong to shipped orders; null fields leave the saved details alone. */
    private void applyTracking(CustomerOrder order, StatusUpdate request) {
        if (request.trackingCarrier() == null && request.trackingNumber() == null && request.trackingUrl() == null) return;
        String carrier = blankToNull(request.trackingCarrier());
        String number = blankToNull(request.trackingNumber());
        String url = blankToNull(request.trackingUrl());
        boolean shipped = request.status() == OrderStatus.SHIPPED || request.status() == OrderStatus.DELIVERED;
        if (!shipped && (carrier != null || number != null || url != null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add tracking details when the order is marked as shipped.");
        }
        if (url != null && !isSecureWebAddress(url)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The tracking link must be a web address starting with https://.");
        }
        order.setTracking(carrier, number, url);
    }

    static boolean isSecureWebAddress(String value) {
        try {
            URI uri = new URI(value);
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null && !uri.getHost().isBlank();
        } catch (java.net.URISyntaxException exception) {
            return false;
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private Map<UUID, Integer> mergeQuantities(List<CheckoutItem> items) {
        Map<UUID, Integer> merged = new LinkedHashMap<>();
        for (CheckoutItem item : items) {
            int quantity = merged.getOrDefault(item.productId(), 0) + item.quantity();
            if (quantity > 99) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A product quantity cannot exceed 99.");
            merged.put(item.productId(), quantity);
        }
        return merged;
    }

    private Product findProductForCheckout(UUID id) {
        return products.findByIdForStockUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "A selected product is no longer available."));
    }

    private void restoreStock(CustomerOrder order, UUID actorId) {
        for (OrderItem item : order.getItems()) {
            if (item.getProductId() == null) continue;
            products.findByIdForStockUpdate(item.getProductId()).ifPresent(product -> {
                product.setStockQuantity(product.getStockQuantity() + item.getQuantity());
                stock.record(product, item.getQuantity(), StockMovementReason.CANCELLATION, order.getId(), actorId);
            });
        }
    }

    static Specification<CustomerOrder> matching(String query, OrderStatus status, PlacedBetween placed) {
        Specification<CustomerOrder> spec = (root, criteria, builder) -> builder.conjunction();
        if (status != null) spec = spec.and((root, criteria, builder) -> builder.equal(root.get("status"), status));
        if (placed.from() != null) spec = spec.and((root, criteria, builder) -> builder.greaterThanOrEqualTo(root.get("createdAt"), placed.from()));
        if (placed.until() != null) spec = spec.and((root, criteria, builder) -> builder.lessThan(root.get("createdAt"), placed.until()));
        String search = query == null ? "" : query.trim().toLowerCase();
        if (search.length() > MAX_QUERY_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Search must be " + MAX_QUERY_LENGTH + " characters or fewer.");
        }
        if (!search.isEmpty()) {
            String pattern = LikePattern.contains(search);
            spec = spec.and((root, criteria, builder) -> builder.or(
                    builder.like(builder.lower(root.get("orderNumber")), pattern, LikePattern.ESCAPE),
                    builder.like(builder.lower(root.get("shippingFullName")), pattern, LikePattern.ESCAPE),
                    builder.like(builder.lower(root.get("shippingEmail")), pattern, LikePattern.ESCAPE),
                    builder.like(root.get("shippingPhone"), pattern, LikePattern.ESCAPE)));
        }
        return spec;
    }

    /** Statuses customers hear about; PROCESSING is internal and PENDING_PAYMENT is covered by the order email. */
    static OrderEmail.Kind emailFor(OrderStatus status) {
        return switch (status) {
            case CONFIRMED -> OrderEmail.Kind.CONFIRMED;
            case SHIPPED -> OrderEmail.Kind.SHIPPED;
            case DELIVERED -> OrderEmail.Kind.DELIVERED;
            case CANCELLED -> OrderEmail.Kind.CANCELLED;
            case PENDING_PAYMENT, PROCESSING -> null;
        };
    }

    private OrderEmail email(CustomerOrder order, OrderEmail.Kind kind) {
        String address = String.join(", ", order.getShippingAddress(), order.getShippingCity(),
                order.getShippingState() + " " + order.getShippingPostalCode());
        OrderEmail.Tracking tracking = order.getTrackingNumber() == null && order.getTrackingUrl() == null ? null
                : new OrderEmail.Tracking(order.getTrackingCarrier(), order.getTrackingNumber(), order.getTrackingUrl());
        return new OrderEmail(kind, order.getShippingEmail(), order.getShippingFullName(), order.getOrderNumber(),
                order.getTotalAmount(), order.getItems().stream()
                        .map(item -> new OrderEmail.Line(item.getProductName(), item.getQuantity(), item.getLineTotal())).toList(),
                address, tracking);
    }

    private void validateTransition(OrderStatus previous, OrderStatus next) {
        if (previous == next) return;
        boolean valid = switch (previous) {
            case PENDING_PAYMENT -> next == OrderStatus.CONFIRMED || next == OrderStatus.CANCELLED;
            case CONFIRMED -> next == OrderStatus.PROCESSING || next == OrderStatus.CANCELLED;
            case PROCESSING -> next == OrderStatus.SHIPPED || next == OrderStatus.CANCELLED;
            case SHIPPED -> next == OrderStatus.DELIVERED;
            case DELIVERED, CANCELLED -> false;
        };
        if (!valid) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Cannot change an order from " + previous + " to " + next + ".");
    }

    private CustomerOrder find(UUID id) { return orders.findById(id).orElseThrow(this::notFound); }
    private ResponseStatusException notFound() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found."); }
    private String clean(String value) { return value.trim(); }

    private Response response(CustomerOrder order) {
        return new Response(order.getId(), order.getOrderNumber(), order.getStatus(), order.getPaymentStatus(),
                order.getPaymentMethod(), order.getSubtotal(), order.getShippingAmount(), order.getTotalAmount(),
                order.getShippingFullName(), order.getShippingEmail(), order.getShippingPhone(), order.getShippingAddress(),
                order.getShippingCity(), order.getShippingState(), order.getShippingPostalCode(), order.getCreatedAt(),
                order.getItems().stream().map(item -> new ItemResponse(item.getProductId(), item.getProductName(),
                        item.getProductSku(), item.getUnitPrice(), item.getQuantity(), item.getLineTotal())).toList(),
                order.getStatusHistory().stream().map(history -> new StatusHistoryResponse(history.getStatus(),
                        history.getNote(), history.getCreatedAt())).toList(),
                order.getTrackingCarrier(), order.getTrackingNumber(), order.getTrackingUrl(),
                CUSTOMER_CANCELLABLE.contains(order.getStatus()) && order.getPaymentStatus() != PaymentStatus.PAID
                        && !isBookedWithCourier(order),
                canPay(order), order.getPaymentDueAt());
    }
}
