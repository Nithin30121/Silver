package com.silvestoluxe.api.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.silvestoluxe.api.account.AccountController;
import com.silvestoluxe.api.account.AccountDeletionService;
import com.silvestoluxe.api.account.AccountProfileService;
import com.silvestoluxe.api.account.AddressController;
import com.silvestoluxe.api.account.AddressDtos.AddressResponse;
import com.silvestoluxe.api.account.AddressService;
import com.silvestoluxe.api.account.SupabaseAuthAdminClient;
import com.silvestoluxe.api.order.OrderController;
import com.silvestoluxe.api.order.OrderService;
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

/**
 * Saved addresses, cancelling and account deletion belong to the signed-in customer only. Account
 * deletion runs for real here, so the sign-in time is read from a genuinely decoded Supabase token.
 */
@WebMvcTest({ AccountController.class, AddressController.class, OrderController.class })
@Import({ SecurityConfig.class, AccountDeletionService.class })
class CustomerAccountAccessTest {

    @DynamicPropertySource
    static void supabaseJwks(DynamicPropertyRegistry registry) {
        registry.add("SUPABASE_JWKS_URL", TestJwks::jwksUrl);
    }

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private AccountProfileService profiles;

    @MockitoBean
    private AddressService addresses;

    @MockitoBean
    private OrderService orders;

    @MockitoBean
    private SupabaseAuthAdminClient auth;

    @MockitoBean(name = "catalogAuthorization")
    private CatalogAuthorization authorization;

    private final UUID customerId = UUID.randomUUID();

    @Test
    void refusesAccountRequestsWithoutAToken() throws Exception {
        mvc.perform(get("/api/me/addresses")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/me/addresses").contentType(MediaType.APPLICATION_JSON).content(validAddress()))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/me")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/orders/" + UUID.randomUUID() + "/cancel")).andExpect(status().isUnauthorized());
        verifyNoInteractions(addresses, orders, auth);
    }

    @Test
    void listsTheSignedInCustomersOwnAddresses() throws Exception {
        when(addresses.list(customerId.toString())).thenReturn(List.of(new AddressResponse(UUID.randomUUID(), "Asha Rao",
                "+91 90000 00001", "12 Sample Street", "Hyderabad", "Telangana", "500001", true)));

        mvc.perform(get("/api/me/addresses").header(HttpHeaders.AUTHORIZATION, bearer(Map.of())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].postalCode").value("500001"))
                .andExpect(jsonPath("$[0].defaultAddress").value(true));
    }

    @Test
    void explainsAnInvalidPinCode() throws Exception {
        mvc.perform(post("/api/me/addresses").header(HttpHeaders.AUTHORIZATION, bearer(Map.of()))
                        .contentType(MediaType.APPLICATION_JSON).content(validAddress().replace("500001", "5000")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.postalCode").value("Please enter a 6-digit PIN code."));
        verify(addresses, never()).create(any(), any());
    }

    @Test
    void deletesAnAccountRightAfterThePasswordIsEntered() throws Exception {
        signedInCustomer();

        mvc.perform(delete("/api/me").header(HttpHeaders.AUTHORIZATION, bearer(signedInAt(Instant.now().minusSeconds(30)))))
                .andExpect(status().isNoContent());
        verify(auth).deleteUser(eq(customerId));
    }

    @Test
    void asksForThePasswordAgainWhenTheSignInIsOld() throws Exception {
        signedInCustomer();

        mvc.perform(delete("/api/me").header(HttpHeaders.AUTHORIZATION, bearer(signedInAt(Instant.now().minusSeconds(3600)))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("For your security, please enter your password again before deleting your account."));
        mvc.perform(delete("/api/me").header(HttpHeaders.AUTHORIZATION, bearer(Map.of())))
                .andExpect(status().isForbidden());
        verify(auth, never()).deleteUser(any());
    }

    private void signedInCustomer() {
        when(profiles.currentUser(customerId.toString())).thenReturn(new AccountProfileService.CurrentUser(
                customerId, "Asha Rao", "asha@example.com", "customer", Instant.now(), Instant.now()));
    }

    /** The "amr" claim exactly as Supabase writes it after a password sign-in. */
    private static Map<String, Object> signedInAt(Instant when) {
        return Map.of("amr", List.of(Map.of("method", "password", "timestamp", when.getEpochSecond())));
    }

    private String bearer(Map<String, Object> claims) {
        return "Bearer " + TestJwks.accessToken(TestJwks.SUPABASE_KEY, customerId.toString(), claims);
    }

    private static String validAddress() {
        return """
                {"fullName":"Asha Rao","phone":"+91 90000 00001","addressLine":"12 Sample Street",
                 "city":"Hyderabad","state":"Telangana","postalCode":"500001","makeDefault":true}
                """;
    }
}
