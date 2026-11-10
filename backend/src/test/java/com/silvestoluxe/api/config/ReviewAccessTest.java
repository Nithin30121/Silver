package com.silvestoluxe.api.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import com.silvestoluxe.api.review.ReviewController;
import com.silvestoluxe.api.review.ReviewDtos.ProductReviews;
import com.silvestoluxe.api.review.ReviewService;
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

/** Anyone may read a product's approved reviews; writing one needs an account; moderating needs an admin. */
@WebMvcTest(ReviewController.class)
@Import(SecurityConfig.class)
class ReviewAccessTest {

    @DynamicPropertySource
    static void supabaseJwks(DynamicPropertyRegistry registry) {
        registry.add("SUPABASE_JWKS_URL", TestJwks::jwksUrl);
    }

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private ReviewService reviews;

    @MockitoBean(name = "catalogAuthorization")
    private CatalogAuthorization authorization;

    private static final String REVIEW = "{\"rating\":5,\"comment\":\"Beautiful finish.\"}";

    private static String customer(String subject) {
        return "Bearer " + TestJwks.accessToken(TestJwks.SUPABASE_KEY, subject);
    }

    @Test
    void aVisitorCanReadAProductsReviews() throws Exception {
        UUID productId = UUID.randomUUID();
        when(reviews.forProduct(productId, 0, 5)).thenReturn(new ProductReviews(null, 0, List.of(0L, 0L, 0L, 0L, 0L), List.of(), 0, 0, false));

        mvc.perform(get("/api/products/" + productId + "/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewCount").value(0));
    }

    @Test
    void writingAReviewNeedsAnAccount() throws Exception {
        UUID productId = UUID.randomUUID();
        mvc.perform(put("/api/me/reviews/" + productId).contentType(MediaType.APPLICATION_JSON).content(REVIEW))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/me/reviews/" + productId)).andExpect(status().isUnauthorized());
        verify(reviews, never()).save(any(), any(), any());
    }

    @Test
    void aSignedInCustomerWritesTheirOwnReview() throws Exception {
        UUID productId = UUID.randomUUID();
        String subject = UUID.randomUUID().toString();

        mvc.perform(put("/api/me/reviews/" + productId).header(HttpHeaders.AUTHORIZATION, customer(subject))
                        .contentType(MediaType.APPLICATION_JSON).content(REVIEW))
                .andExpect(status().isOk());

        verify(reviews).save(eq(productId), eq(subject), any());
    }

    @Test
    void explainsAMissingRating() throws Exception {
        mvc.perform(put("/api/me/reviews/" + UUID.randomUUID()).header(HttpHeaders.AUTHORIZATION, customer(UUID.randomUUID().toString()))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"rating\":0,\"comment\":\"Lovely.\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.rating").value("Please choose a star rating."));
        verify(reviews, never()).save(any(), any(), any());
    }

    @Test
    void saysWhenACustomerHasNoReviewYet() throws Exception {
        mvc.perform(get("/api/me/reviews/" + UUID.randomUUID()).header(HttpHeaders.AUTHORIZATION, customer(UUID.randomUUID().toString())))
                .andExpect(status().isNoContent());
    }

    @Test
    void keepsModerationFromEveryoneButAdmins() throws Exception {
        String id = UUID.randomUUID().toString();
        mvc.perform(get("/api/admin/reviews")).andExpect(status().isUnauthorized());
        when(authorization.isAdmin(any())).thenReturn(false);
        String someone = customer(UUID.randomUUID().toString());
        mvc.perform(get("/api/admin/reviews").header(HttpHeaders.AUTHORIZATION, someone)).andExpect(status().isForbidden());
        mvc.perform(patch("/api/admin/reviews/" + id + "/status").header(HttpHeaders.AUTHORIZATION, someone)
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"APPROVED\"}")).andExpect(status().isForbidden());
        mvc.perform(delete("/api/admin/reviews/" + id).header(HttpHeaders.AUTHORIZATION, someone)).andExpect(status().isForbidden());
        verify(reviews, never()).list(any(), anyInt(), anyInt());
        verify(reviews, never()).updateStatus(any(), any());
        verify(reviews, never()).delete(any());
    }

    @Test
    void anAdminCanApproveAndRemoveReviews() throws Exception {
        when(authorization.isAdmin(any())).thenReturn(true);
        String admin = customer(UUID.randomUUID().toString());
        UUID id = UUID.randomUUID();

        mvc.perform(patch("/api/admin/reviews/" + id + "/status").header(HttpHeaders.AUTHORIZATION, admin)
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"APPROVED\"}")).andExpect(status().isOk());
        mvc.perform(delete("/api/admin/reviews/" + id).header(HttpHeaders.AUTHORIZATION, admin)).andExpect(status().isNoContent());

        verify(reviews).updateStatus(id, com.silvestoluxe.api.review.ReviewStatus.APPROVED);
        verify(reviews).delete(id);
    }
}
