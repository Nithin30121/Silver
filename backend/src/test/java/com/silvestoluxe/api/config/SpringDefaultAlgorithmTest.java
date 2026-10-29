package com.silvestoluxe.api.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import com.silvestoluxe.api.account.AccountController;
import com.silvestoluxe.api.account.AccountProfileService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Documents the original 401 bug: with Spring's default (RS256 only), a genuine Supabase ES256
 * token is rejected. application.yml now sets jws-algorithms so this no longer happens.
 */
@WebMvcTest(AccountController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = "spring.security.oauth2.resourceserver.jwt.jws-algorithms=RS256")
class SpringDefaultAlgorithmTest {

    @DynamicPropertySource
    static void supabaseJwks(DynamicPropertyRegistry registry) {
        registry.add("SUPABASE_JWKS_URL", TestJwks::jwksUrl);
    }

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private AccountProfileService profiles;

    @MockitoBean
    private com.silvestoluxe.api.account.AccountDeletionService deletion;

    @Test
    void rs256OnlyRejectsGenuineSupabaseTokens() throws Exception {
        String genuine = TestJwks.accessToken(TestJwks.SUPABASE_KEY, UUID.randomUUID().toString());

        mvc.perform(get("/api/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + genuine))
                .andExpect(status().isUnauthorized());
    }
}
