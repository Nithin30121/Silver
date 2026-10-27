package com.silvestoluxe.api.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.silvestoluxe.api.customer.CustomerController;
import com.silvestoluxe.api.customer.CustomerDtos.Summary;
import com.silvestoluxe.api.customer.CustomerService;
import com.silvestoluxe.api.order.OrderService;
import com.silvestoluxe.api.security.CatalogAuthorization;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** The customer directory exposes names and emails, so only an admin profile may read it. */
@WebMvcTest(CustomerController.class)
@Import(SecurityConfig.class)
class AdminCustomerAccessTest {

    @DynamicPropertySource
    static void supabaseJwks(DynamicPropertyRegistry registry) {
        registry.add("SUPABASE_JWKS_URL", TestJwks::jwksUrl);
    }

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private CustomerService customers;

    @MockitoBean
    private OrderService orders;

    @MockitoBean(name = "catalogAuthorization")
    private CatalogAuthorization authorization;

    @Test
    void refusesRequestsWithoutAToken() throws Exception {
        mvc.perform(get("/api/admin/customers")).andExpect(status().isUnauthorized());
        verify(customers, never()).list(any(), any(), any(Integer.class), any(Integer.class));
    }

    @Test
    void refusesASignedInCustomer() throws Exception {
        when(authorization.isAdmin(any())).thenReturn(false);

        mvc.perform(get("/api/admin/customers").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/customers/" + UUID.randomUUID() + "/orders").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isForbidden());
        verify(customers, never()).list(any(), any(), any(Integer.class), any(Integer.class));
        verify(customers, never()).find(any());
    }

    @Test
    void listsCustomersForAnAdmin() throws Exception {
        when(authorization.isAdmin(any())).thenReturn(true);
        Summary customer = new Summary(UUID.randomUUID(), "Asha Rao", "asha@example.com", "customer",
                Instant.parse("2026-10-01T00:00:00Z"), 2, new BigDecimal("3888.00"), Instant.parse("2026-10-20T00:00:00Z"));
        when(customers.list("asha", "customer", 0, 25))
                .thenReturn(new PageImpl<>(List.of(customer), PageRequest.of(0, 25), 1));

        mvc.perform(get("/api/admin/customers").param("query", "asha").param("role", "customer")
                        .header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].email").value("asha@example.com"))
                .andExpect(jsonPath("$.content[0].orderCount").value(2))
                .andExpect(jsonPath("$.page.totalElements").value(1));
    }

    private static String bearer() {
        return "Bearer " + TestJwks.accessToken(TestJwks.SUPABASE_KEY, UUID.randomUUID().toString());
    }
}
