package com.silvestoluxe.api.report;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import com.silvestoluxe.api.customer.CustomerDtos;
import com.silvestoluxe.api.customer.CustomerService;
import com.silvestoluxe.api.order.OrderDtos;
import com.silvestoluxe.api.order.OrderService;
import com.silvestoluxe.api.order.OrderStatus;
import com.silvestoluxe.api.order.PlacedBetween;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Sales summary and spreadsheet downloads for administrators. The class-level check covers every endpoint. */
@RestController
@RequestMapping("/api/admin/reports")
@PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
public class ReportController {
    private static final DateTimeFormatter LOCAL_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final ReportService reports;
    private final OrderService orders;
    private final CustomerService customers;

    public ReportController(ReportService reports, OrderService orders, CustomerService customers) {
        this.reports = reports;
        this.orders = orders;
        this.customers = customers;
    }

    @GetMapping("/summary")
    public ReportService.Summary summary() { return reports.summary(); }

    /** Order value over time, for the overview chart. Dates are ISO days, for example 2026-10-28. */
    @GetMapping("/sales")
    public ReportService.SalesSeries sales(@RequestParam LocalDate from, @RequestParam LocalDate to,
                                           @RequestParam(defaultValue = "DAY") ReportService.Interval interval) {
        return reports.sales(from, to, interval);
    }

    @GetMapping("/sales-by-category")
    public ReportService.CategoryBreakdown salesByCategory(@RequestParam LocalDate from, @RequestParam LocalDate to) {
        return reports.salesByCategory(from, to);
    }

    @GetMapping("/sales-by-payment-method")
    public ReportService.PaymentBreakdown salesByPaymentMethod(@RequestParam LocalDate from, @RequestParam LocalDate to) {
        return reports.salesByPaymentMethod(from, to);
    }

    /** New customer accounts over time, for the Reports page chart. */
    @GetMapping("/customer-growth")
    public ReportService.CustomerGrowth customerGrowth(@RequestParam LocalDate from, @RequestParam LocalDate to,
                                                       @RequestParam(defaultValue = "DAY") ReportService.Interval interval) {
        return reports.customerGrowth(from, to, interval);
    }

    @GetMapping("/orders.csv")
    public ResponseEntity<byte[]> ordersCsv(@RequestParam(required = false) String query,
                                            @RequestParam(required = false) OrderStatus status,
                                            @RequestParam(required = false) LocalDate from,
                                            @RequestParam(required = false) LocalDate to) {
        StringBuilder csv = new StringBuilder(Csv.BYTE_ORDER_MARK).append(Csv.row(List.of(
                "Order number", "Placed (" + reports.zone().getId() + ")", "Status", "Payment status", "Payment method",
                "Customer name", "Email", "Phone", "Address", "City", "State", "Postal code",
                "Items", "Pieces", "Subtotal", "Shipping", "Total")));
        for (OrderDtos.Response order : orders.export(query, status, PlacedBetween.days(from, to, reports.zone()))) {
            List<Object> cells = new ArrayList<>(List.of(order.orderNumber(), localTime(order.createdAt()),
                    order.status().name(), order.paymentStatus().name(), order.paymentMethod().name()));
            cells.add(order.shippingFullName());
            cells.add(order.shippingEmail());
            cells.add(order.shippingPhone());
            cells.add(order.shippingAddress());
            cells.add(order.shippingCity());
            cells.add(order.shippingState());
            cells.add(order.shippingPostalCode());
            cells.add(order.items().stream().map(item -> item.productName() + " x " + item.quantity()).collect(Collectors.joining("; ")));
            cells.add(order.items().stream().mapToInt(OrderDtos.ItemResponse::quantity).sum());
            cells.add(order.subtotal());
            cells.add(order.shippingAmount());
            cells.add(order.totalAmount());
            csv.append(Csv.row(cells));
        }
        return download(csv, "orders");
    }

    @GetMapping("/customers.csv")
    public ResponseEntity<byte[]> customersCsv(@RequestParam(required = false) String query,
                                               @RequestParam(required = false) String role) {
        StringBuilder csv = new StringBuilder(Csv.BYTE_ORDER_MARK).append(Csv.row(List.of(
                "Name", "Email", "Account", "Joined (" + reports.zone().getId() + ")", "Orders",
                "Order value (excludes cancelled)", "Last order")));
        for (CustomerDtos.Summary customer : customers.export(query, role)) {
            List<Object> cells = new ArrayList<>();
            cells.add(customer.fullName());
            cells.add(customer.email());
            cells.add(customer.role());
            cells.add(localTime(customer.joinedAt()));
            cells.add(customer.orderCount());
            cells.add(customer.orderValue());
            cells.add(localTime(customer.lastOrderAt()));
            csv.append(Csv.row(cells));
        }
        return download(csv, "customers");
    }

    private String localTime(Instant instant) {
        return instant == null ? null : LOCAL_TIME.format(instant.atZone(reports.zone()));
    }

    private ResponseEntity<byte[]> download(StringBuilder csv, String name) {
        String filename = "silvora-" + name + "-" + LocalDate.now(reports.zone()) + ".csv";
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(csv.toString().getBytes(StandardCharsets.UTF_8));
    }
}
