package com.silvestoluxe.api.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import com.silvestoluxe.api.payment.PaymentController;
import com.silvestoluxe.api.payment.PaymentService;
import com.silvestoluxe.api.payment.RazorpayClient;
import com.silvestoluxe.api.payment.RazorpayWebhookController;
import com.silvestoluxe.api.payment.RazorpayWebhookService;
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

/** Paying needs a signed-in customer, payment records need an admin, and webhooks need a real signature. */
@WebMvcTest({ PaymentController.class, RazorpayWebhookController.class })
@Import(SecurityConfig.class)
class PaymentAccessTest {
    private static final String ORDER = "/api/orders/" + UUID.randomUUID();
    private static final String PROOF = "{\"razorpayOrderId\":\"order_1\",\"razorpayPaymentId\":\"pay_1\",\"razorpaySignature\":\"%s\"}";
    private static final byte[] EVENT = "{\"event\":\"payment.captured\"}".getBytes();

    @DynamicPropertySource
    static void supabaseJwks(DynamicPropertyRegistry registry) {
        registry.add("SUPABASE_JWKS_URL", TestJwks::jwksUrl);
    }

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private PaymentService payments;

    @MockitoBean
    private RazorpayClient razorpay;

    @MockitoBean
    private RazorpayWebhookService webhooks;

    @MockitoBean(name = "catalogAuthorization")
    private CatalogAuthorization authorization;

    private static String customer() { return "Bearer " + TestJwks.accessToken(TestJwks.SUPABASE_KEY, UUID.randomUUID().toString()); }

    @Test
    void aVisitorCannotPayOrSeePaymentOptions() throws Exception {
        mvc.perform(post(ORDER + "/payment")).andExpect(status().isUnauthorized());
        mvc.perform(post(ORDER + "/payment/verify").contentType(MediaType.APPLICATION_JSON).content(PROOF.formatted("a".repeat(64))))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/orders/payment-options")).andExpect(status().isUnauthorized());
        verify(payments, never()).start(any(), any());
    }

    @Test
    void aSignedInCustomerCanPay() throws Exception {
        mvc.perform(post(ORDER + "/payment").header(HttpHeaders.AUTHORIZATION, customer())).andExpect(status().isOk());
        mvc.perform(post(ORDER + "/payment/verify").header(HttpHeaders.AUTHORIZATION, customer())
                        .contentType(MediaType.APPLICATION_JSON).content(PROOF.formatted("a".repeat(64))))
                .andExpect(status().isOk());
    }

    @Test
    void refusesProofThatCouldReachAnotherAddress() throws Exception {
        String sneaky = "{\"razorpayOrderId\":\"order_1\",\"razorpayPaymentId\":\"pay_1/../../orders\",\"razorpaySignature\":\"" + "a".repeat(64) + "\"}";
        mvc.perform(post(ORDER + "/payment/verify").header(HttpHeaders.AUTHORIZATION, customer())
                        .contentType(MediaType.APPLICATION_JSON).content(sneaky))
                .andExpect(status().isBadRequest());
        mvc.perform(post(ORDER + "/payment/verify").header(HttpHeaders.AUTHORIZATION, customer())
                        .contentType(MediaType.APPLICATION_JSON).content(PROOF.formatted("not-a-signature")))
                .andExpect(status().isBadRequest());
        verify(payments, never()).verify(any(), any(), any());
    }

    @Test
    void keepsPaymentRecordsFromEveryoneButAdmins() throws Exception {
        String records = "/api/admin" + ORDER.substring("/api".length()) + "/payments";
        mvc.perform(get(records)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/payments/refunds-to-make")).andExpect(status().isUnauthorized());
        when(authorization.isAdmin(any())).thenReturn(false);
        mvc.perform(get(records).header(HttpHeaders.AUTHORIZATION, customer())).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/payments/refunds-to-make").header(HttpHeaders.AUTHORIZATION, customer())).andExpect(status().isForbidden());
        when(authorization.isAdmin(any())).thenReturn(true);
        mvc.perform(get(records).header(HttpHeaders.AUTHORIZATION, customer())).andExpect(status().isOk());
        mvc.perform(get("/api/admin/payments/refunds-to-make").header(HttpHeaders.AUTHORIZATION, customer())).andExpect(status().isOk());
    }

    @Test
    void razorpayReachesTheWebhookWithoutSigningIn() throws Exception {
        when(razorpay.canCheckWebhooks()).thenReturn(true);
        when(razorpay.isGenuineWebhook(any(), eq("good"))).thenReturn(true);

        mvc.perform(post("/api/webhooks/razorpay").contentType(MediaType.APPLICATION_JSON).content(EVENT)
                        .header("X-Razorpay-Signature", "good").header("x-razorpay-event-id", "evt_1"))
                .andExpect(status().isOk());

        verify(webhooks).handle("evt_1", EVENT);
    }

    @Test
    void refusesAWebhookWithAWrongOrMissingSignature() throws Exception {
        when(razorpay.canCheckWebhooks()).thenReturn(true);
        when(razorpay.isGenuineWebhook(any(), eq("forged"))).thenReturn(false);

        mvc.perform(post("/api/webhooks/razorpay").contentType(MediaType.APPLICATION_JSON).content(EVENT).header("X-Razorpay-Signature", "forged"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/webhooks/razorpay").contentType(MediaType.APPLICATION_JSON).content(EVENT))
                .andExpect(status().isBadRequest());

        verify(webhooks, never()).handle(any(), any());
    }

    @Test
    void refusesWebhooksUntilASecretIsSet() throws Exception {
        when(razorpay.canCheckWebhooks()).thenReturn(false);

        mvc.perform(post("/api/webhooks/razorpay").contentType(MediaType.APPLICATION_JSON).content(EVENT).header("X-Razorpay-Signature", "anything"))
                .andExpect(status().isServiceUnavailable());

        verify(webhooks, never()).handle(any(), any());
    }

    @Test
    void theWebhookAddressTakesNothingButPost() throws Exception {
        mvc.perform(get("/api/webhooks/razorpay")).andExpect(status().isUnauthorized());
    }
}
