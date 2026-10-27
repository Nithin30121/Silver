package com.silvestoluxe.api.customer;

import static com.silvestoluxe.api.customer.CustomerDtos.Summary;

import java.util.UUID;

import com.silvestoluxe.api.order.OrderDtos;
import com.silvestoluxe.api.order.OrderService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Customer directory for administrators. The class-level check covers every endpoint added here. */
@RestController
@RequestMapping("/api/admin/customers")
@PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
public class CustomerController {
    private final CustomerService customers;
    private final OrderService orders;

    public CustomerController(CustomerService customers, OrderService orders) {
        this.customers = customers;
        this.orders = orders;
    }

    @GetMapping
    public Page<Summary> list(@RequestParam(required = false) String query,
                              @RequestParam(required = false) String role,
                              @RequestParam(defaultValue = "0") int page,
                              @RequestParam(defaultValue = "25") int size) {
        return customers.list(query, role, page, size);
    }

    @GetMapping("/{id}")
    public Summary customer(@PathVariable UUID id) { return customers.find(id); }

    @GetMapping("/{id}/orders")
    public Page<OrderDtos.Response> customerOrders(@PathVariable UUID id, Pageable pageable) {
        customers.find(id);
        return orders.forCustomer(id, pageable);
    }
}
