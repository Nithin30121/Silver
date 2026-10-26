package com.silvestoluxe.api.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.UUID;

import com.silvestoluxe.api.account.AccountController;
import com.silvestoluxe.api.account.AccountProfileService;
import com.silvestoluxe.api.account.AccountProfileService.CurrentUser;
import jakarta.servlet.MultipartConfigElement;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.servlet.autoconfigure.MultipartAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Runs the real security configuration from application.yml against Supabase-style access tokens. */
@WebMvcTest(AccountController.class)
@Import(SecurityConfig.class)
// The MVC test slice leaves out multipart settings; load them so the upload limit is checked too.
@ImportAutoConfiguration(MultipartAutoConfiguration.class)
class SupabaseAccessTokenTest {

    @DynamicPropertySource
    static void supabaseJwks(DynamicPropertyRegistry registry) {
        registry.add("SUPABASE_JWKS_URL", TestJwks::jwksUrl);
    }

    @Autowired
    private MockMvc mvc;

    @Autowired
    private MultipartConfigElement multipart;

    @MockitoBean
    private AccountProfileService profiles;

    @Test
    void acceptsAnEs256AccessTokenSignedByTheProjectKey() throws Exception {
        UUID userId = UUID.randomUUID();
        when(profiles.currentUser(userId.toString())).thenReturn(new CurrentUser(
                userId, "Asha Rao", "asha@example.com", "customer", Instant.now(), Instant.now()));

        mvc.perform(get("/api/me").header(HttpHeaders.AUTHORIZATION,
                        "Bearer " + TestJwks.accessToken(TestJwks.SUPABASE_KEY, userId.toString())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("asha@example.com"));
    }

    @Test
    void rejectsATokenSignedByAnyOtherKey() throws Exception {
        // Same key id and algorithm as the real key, but a different private key.
        String forged = TestJwks.accessToken(TestJwks.es256Key("supabase-signing-key"), UUID.randomUUID().toString());

        mvc.perform(get("/api/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + forged))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsRequestsWithoutAToken() throws Exception {
        mvc.perform(get("/api/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void allowsProductImageUploadsUpToFiveMegabytes() {
        assertEquals(5L * 1024 * 1024, multipart.getMaxFileSize());
    }
}
