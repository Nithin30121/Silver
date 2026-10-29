package com.silvestoluxe.api.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import com.silvestoluxe.api.interest.ProductInterestController;
import com.silvestoluxe.api.interest.ProductInterestService;
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

/** Anyone may count a wishlist add, signed in or not; only an admin may read the counts. */
@WebMvcTest(ProductInterestController.class)
@Import(SecurityConfig.class)
class WishlistCountAccessTest {

    @DynamicPropertySource
    static void supabaseJwks(DynamicPropertyRegistry registry) {
        registry.add("SUPABASE_JWKS_URL", TestJwks::jwksUrl);
    }

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private ProductInterestService interest;

    @MockitoBean(name = "catalogAuthorization")
    private CatalogAuthorization authorization;

    @Test
    void visitorsCanCountAnAddWithoutSigningIn() throws Exception {
        UUID ring = UUID.randomUUID();

        mvc.perform(post("/api/products/" + ring + "/wishlist-adds").header("X-Forwarded-For", "203.0.113.7, 10.0.0.1"))
                .andExpect(status().isNoContent());

        verify(interest).recordWishlistAdd(ring, "203.0.113.7");
    }

    @Test
    void onlyAdminsCanReadTheCounts() throws Exception {
        mvc.perform(get("/api/admin/wishlist-counts")).andExpect(status().isUnauthorized());
        when(authorization.isAdmin(any())).thenReturn(false);
        mvc.perform(get("/api/admin/wishlist-counts").header(HttpHeaders.AUTHORIZATION, bearer())).andExpect(status().isForbidden());
        verifyNoInteractions(interest);

        UUID ring = UUID.randomUUID();
        when(authorization.isAdmin(any())).thenReturn(true);
        when(interest.wishlistCounts()).thenReturn(List.of(new ProductInterestService.WishlistCount(ring, 12, 4)));
        mvc.perform(get("/api/admin/wishlist-counts").header(HttpHeaders.AUTHORIZATION, bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].productId").value(ring.toString()))
                .andExpect(jsonPath("$[0].allTime").value(12))
                .andExpect(jsonPath("$[0].recent").value(4));
    }

    private static String bearer() {
        return "Bearer " + TestJwks.accessToken(TestJwks.SUPABASE_KEY, UUID.randomUUID().toString());
    }
}
