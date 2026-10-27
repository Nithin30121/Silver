package com.silvestoluxe.api.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import com.silvestoluxe.api.customer.CustomerDtos.Summary;
import com.silvestoluxe.api.customer.CustomerService;
import com.silvestoluxe.api.notification.NotificationController;
import com.silvestoluxe.api.notification.OrderEmailService;
import com.silvestoluxe.api.order.OrderService;
import com.silvestoluxe.api.report.ReportController;
import com.silvestoluxe.api.report.ReportService;
import com.silvestoluxe.api.security.CatalogAuthorization;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Sales figures and downloads expose business and customer data, so only an admin profile may read them. */
@WebMvcTest({ ReportController.class, NotificationController.class })
@Import(SecurityConfig.class)
class AdminReportAccessTest {

    @DynamicPropertySource
    static void supabaseJwks(DynamicPropertyRegistry registry) {
        registry.add("SUPABASE_JWKS_URL", TestJwks::jwksUrl);
    }

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private ReportService reports;

    @MockitoBean
    private OrderService orders;

    @MockitoBean
    private CustomerService customers;

    @MockitoBean
    private OrderEmailService emails;

    @MockitoBean(name = "catalogAuthorization")
    private CatalogAuthorization authorization;

    @Test
    void refusesEveryoneButAdmins() throws Exception {
        for (String path : List.of("/api/admin/reports/summary", "/api/admin/reports/orders.csv",
                "/api/admin/reports/customers.csv", "/api/admin/notifications/email")) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized());
        }
        when(authorization.isAdmin(any())).thenReturn(false);
        for (String path : List.of("/api/admin/reports/summary", "/api/admin/reports/orders.csv",
                "/api/admin/reports/customers.csv", "/api/admin/notifications/email")) {
            mvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, bearer())).andExpect(status().isForbidden());
        }
        verifyNoInteractions(reports, orders, customers, emails);
    }

    @Test
    void downloadsCustomersAsASafeSpreadsheet() throws Exception {
        when(authorization.isAdmin(any())).thenReturn(true);
        when(reports.zone()).thenReturn(ZoneId.of("Asia/Kolkata"));
        when(customers.export(null, "customer")).thenReturn(List.of(new Summary(UUID.randomUUID(), "=cmd()", "asha@example.com",
                "customer", Instant.parse("2026-10-01T00:00:00Z"), 2, new BigDecimal("3888.00"), null)));

        mvc.perform(get("/api/admin/reports/customers.csv").param("role", "customer").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "text/csv;charset=UTF-8"))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, org.hamcrest.Matchers.startsWith("attachment; filename=\"silvora-customers-")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString(
                        "\"'=cmd()\",\"asha@example.com\",\"customer\",\"2026-10-01 05:30\",2,3888.00,\r\n")));
    }

    @Test
    void tellsAdminsWhetherEmailIsSetUp() throws Exception {
        when(authorization.isAdmin(any())).thenReturn(true);
        when(emails.isEnabled()).thenReturn(false);

        mvc.perform(get("/api/admin/notifications/email").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false));
    }

    private static String bearer() {
        return "Bearer " + TestJwks.accessToken(TestJwks.SUPABASE_KEY, UUID.randomUUID().toString());
    }
}
