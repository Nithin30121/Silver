package com.silvestoluxe.api.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import com.silvestoluxe.api.delivery.DeliveryController;
import com.silvestoluxe.api.delivery.DeliveryDtos.DeliveryCheck;
import com.silvestoluxe.api.delivery.DeliveryService;
import com.silvestoluxe.api.security.CatalogAuthorization;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Shoppers check a PIN code once signed in; only an admin may book, check or cancel parcels. */
@WebMvcTest(DeliveryController.class)
@Import(SecurityConfig.class)
class DeliveryAccessTest {

    @DynamicPropertySource
    static void supabaseJwks(DynamicPropertyRegistry registry) {
        registry.add("SUPABASE_JWKS_URL", TestJwks::jwksUrl);
    }

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private DeliveryService delivery;

    @MockitoBean(name = "catalogAuthorization")
    private CatalogAuthorization authorization;

    @Test
    void aSignedInShopperCanCheckAPinCode() throws Exception {
        mvc.perform(get("/api/orders/delivery-check").param("pin", "500001")).andExpect(status().isUnauthorized());
        when(delivery.check("500001")).thenReturn(new DeliveryCheck(true, true, false));

        mvc.perform(get("/api/orders/delivery-check").param("pin", "500001").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.serviceable").value(true))
                .andExpect(jsonPath("$.cashOnDelivery").value(false));
    }

    @Test
    void onlyAdminsCanBookParcels() throws Exception {
        UUID order = UUID.randomUUID();
        mvc.perform(post("/api/admin/orders/" + order + "/shipments").contentType(MediaType.APPLICATION_JSON).content("{\"weightGrams\":180}"))
                .andExpect(status().isUnauthorized());
        when(authorization.isAdmin(any())).thenReturn(false);
        mvc.perform(post("/api/admin/orders/" + order + "/shipments").header(HttpHeaders.AUTHORIZATION, bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"weightGrams\":180}")).andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/orders/" + order + "/shipments/" + UUID.randomUUID() + "/cancel")
                .header(HttpHeaders.AUTHORIZATION, bearer())).andExpect(status().isForbidden());
        verifyNoInteractions(delivery);

        when(authorization.isAdmin(any())).thenReturn(true);
        mvc.perform(post("/api/admin/orders/" + order + "/shipments").header(HttpHeaders.AUTHORIZATION, bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"weightGrams\":0}")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/admin/orders/" + order + "/shipments").header(HttpHeaders.AUTHORIZATION, bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"weightGrams\":180}")).andExpect(status().isCreated());
        verify(delivery).book(order, 180);
    }

    private static String bearer() {
        return "Bearer " + TestJwks.accessToken(TestJwks.SUPABASE_KEY, UUID.randomUUID().toString());
    }
}
