package com.silvestoluxe.api.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import com.silvestoluxe.api.product.ProductController;
import com.silvestoluxe.api.product.ProductImageService;
import com.silvestoluxe.api.product.ProductService;
import com.silvestoluxe.api.product.StockLedger;
import com.silvestoluxe.api.security.CatalogAuthorization;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Only an admin may delete a product, and its photo files go only after the product itself is gone. */
@WebMvcTest(ProductController.class)
@Import(SecurityConfig.class)
class ProductDeleteAccessTest {

    @DynamicPropertySource
    static void supabaseJwks(DynamicPropertyRegistry registry) {
        registry.add("SUPABASE_JWKS_URL", TestJwks::jwksUrl);
    }

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private ProductService products;

    @MockitoBean
    private ProductImageService images;

    @MockitoBean
    private StockLedger stock;

    @MockitoBean(name = "catalogAuthorization")
    private CatalogAuthorization authorization;

    @Test
    void onlyAdminsCanDeleteAProduct() throws Exception {
        UUID ring = UUID.randomUUID();
        mvc.perform(delete("/api/admin/products/" + ring)).andExpect(status().isUnauthorized());
        when(authorization.isAdmin(any())).thenReturn(false);
        mvc.perform(delete("/api/admin/products/" + ring).header(HttpHeaders.AUTHORIZATION, bearer())).andExpect(status().isForbidden());
        verifyNoInteractions(products, images);
    }

    @Test
    void anAdminDeletesTheProductThenItsPhotoFiles() throws Exception {
        UUID ring = UUID.randomUUID();
        List<String> photos = List.of(ring + "/front.webp");
        when(authorization.isAdmin(any())).thenReturn(true);
        when(products.delete(ring)).thenReturn(photos);

        mvc.perform(delete("/api/admin/products/" + ring).header(HttpHeaders.AUTHORIZATION, bearer())).andExpect(status().isNoContent());

        InOrder order = inOrder(products, images);
        order.verify(products).delete(ring);
        order.verify(images).deleteStoredFiles(photos);
    }

    private static String bearer() {
        return "Bearer " + TestJwks.accessToken(TestJwks.SUPABASE_KEY, UUID.randomUUID().toString());
    }
}
