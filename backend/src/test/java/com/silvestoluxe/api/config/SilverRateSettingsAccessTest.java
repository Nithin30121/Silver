package com.silvestoluxe.api.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.silvestoluxe.api.security.CatalogAuthorization;
import com.silvestoluxe.api.settings.ShopSettingsController;
import com.silvestoluxe.api.settings.ShopSettingsService;
import com.silvestoluxe.api.settings.SilverRateSettings;
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

/** Only an admin can see or change the shop's silver rate. */
@WebMvcTest(ShopSettingsController.class)
@Import(SecurityConfig.class)
class SilverRateSettingsAccessTest {

    @DynamicPropertySource
    static void supabaseJwks(DynamicPropertyRegistry registry) {
        registry.add("SUPABASE_JWKS_URL", TestJwks::jwksUrl);
    }

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private ShopSettingsService settings;

    @MockitoBean(name = "catalogAuthorization")
    private CatalogAuthorization authorization;

    @Test
    void refusesEveryoneButAdmins() throws Exception {
        mvc.perform(get("/api/admin/settings/silver-rate")).andExpect(status().isUnauthorized());
        when(authorization.isAdmin(any())).thenReturn(false);
        mvc.perform(get("/api/admin/settings/silver-rate").header(HttpHeaders.AUTHORIZATION, bearer())).andExpect(status().isForbidden());
        mvc.perform(put("/api/admin/settings/silver-rate").header(HttpHeaders.AUTHORIZATION, bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"ratePerGram\":195}")).andExpect(status().isForbidden());
        verifyNoInteractions(settings);
    }

    @Test
    void savesTheRate() throws Exception {
        when(authorization.isAdmin(any())).thenReturn(true);
        when(settings.updateSilverRate(any())).thenReturn(new SilverRateSettings(new BigDecimal("195.00"), Instant.parse("2026-10-29T05:00:00Z")));

        mvc.perform(put("/api/admin/settings/silver-rate").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"ratePerGram\":195}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ratePerGram").value(195.00))
                .andExpect(jsonPath("$.rateSetAt").value("2026-10-29T05:00:00Z"));
        verify(settings).updateSilverRate(new SilverRateSettings.Update(new BigDecimal("195")));
    }

    @Test
    void refusesOutOfRangeValuesWithAPlainMessage() throws Exception {
        when(authorization.isAdmin(any())).thenReturn(true);

        mvc.perform(put("/api/admin/settings/silver-rate").header(HttpHeaders.AUTHORIZATION, bearer())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"ratePerGram\":5}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.ratePerGram").value("The rate must be at least ₹10 per gram."));
        verifyNoInteractions(settings);
    }

    private static String bearer() {
        return "Bearer " + TestJwks.accessToken(TestJwks.SUPABASE_KEY, UUID.randomUUID().toString());
    }
}
