package com.silvestoluxe.api.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import com.silvestoluxe.api.order.OrderController;
import com.silvestoluxe.api.order.OrderDeletionService;
import com.silvestoluxe.api.order.OrderService;
import com.silvestoluxe.api.security.CatalogAuthorization;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

/** Only an admin may delete an order, and the reason an order is kept reaches the dashboard. */
@WebMvcTest(OrderController.class)
@Import(SecurityConfig.class)
class OrderDeleteAccessTest {

    @DynamicPropertySource
    static void supabaseJwks(DynamicPropertyRegistry registry) {
        registry.add("SUPABASE_JWKS_URL", TestJwks::jwksUrl);
    }

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private OrderService orders;

    @MockitoBean
    private OrderDeletionService deletion;

    @MockitoBean(name = "catalogAuthorization")
    private CatalogAuthorization authorization;

    @Test
    void onlyAdminsCanDeleteAnOrder() throws Exception {
        UUID order = UUID.randomUUID();
        mvc.perform(delete("/api/admin/orders/" + order)).andExpect(status().isUnauthorized());
        when(authorization.isAdmin(any())).thenReturn(false);
        mvc.perform(delete("/api/admin/orders/" + order).header(HttpHeaders.AUTHORIZATION, bearer(UUID.randomUUID())))
                .andExpect(status().isForbidden());
        verifyNoInteractions(deletion);
    }

    @Test
    void anAdminDeletesTheOrderAsThemself() throws Exception {
        UUID order = UUID.randomUUID();
        UUID admin = UUID.randomUUID();
        when(authorization.isAdmin(any())).thenReturn(true);

        mvc.perform(delete("/api/admin/orders/" + order).header(HttpHeaders.AUTHORIZATION, bearer(admin))).andExpect(status().isNoContent());

        verify(deletion).delete(order, admin);
    }

    @Test
    void anOrderThatMustStaySaysWhy() throws Exception {
        UUID order = UUID.randomUUID();
        UUID admin = UUID.randomUUID();
        when(authorization.isAdmin(any())).thenReturn(true);
        when(deletion.delete(order, admin)).thenThrow(new ResponseStatusException(HttpStatus.CONFLICT,
                "Money was taken for this order, so it's kept for your records."));

        mvc.perform(delete("/api/admin/orders/" + order).header(HttpHeaders.AUTHORIZATION, bearer(admin)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Money was taken for this order, so it's kept for your records."));
    }

    private static String bearer(UUID subject) {
        return "Bearer " + TestJwks.accessToken(TestJwks.SUPABASE_KEY, subject.toString());
    }
}
