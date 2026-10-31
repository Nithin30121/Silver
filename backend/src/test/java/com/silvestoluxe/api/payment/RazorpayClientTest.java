package com.silvestoluxe.api.payment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import com.silvestoluxe.api.payment.RazorpayClient.Payment;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class RazorpayClientTest {
    // Worked out separately with openssl, so these don't just repeat the code under test.
    private static final String PAYMENT_SIGNATURE = "8eb2e5536e41b0af119ccf4564a235ba754226adfdb30be036d4343292ef635b";
    private static final String WEBHOOK_SIGNATURE = "0e95258623492dd0dae77245c958c256d46b4a30b338084b7e996fc25653c79c";
    private static final byte[] WEBHOOK_BODY = "{\"event\":\"payment.captured\"}".getBytes(StandardCharsets.UTF_8);

    private final HttpClient http = mock(HttpClient.class);
    private final RazorpayClient razorpay = new RazorpayClient(http, "https://api.razorpay.test/", "rzp_test_abc", "test-key-secret", "webhook-secret");

    @Test
    void staysOffUntilBothKeysAreSet() {
        assertFalse(new RazorpayClient(http, "https://api.razorpay.test", "", "", "").isEnabled());
        assertFalse(new RazorpayClient(http, "https://api.razorpay.test", "rzp_test_abc", " ", "").isEnabled());
        assertTrue(razorpay.isEnabled());
        assertThrows(RazorpayException.class, () -> new RazorpayClient(http, "https://api.razorpay.test", "", "", "").fetchPayment("pay_1"));
    }

    @Test
    void acceptsOnlyTheRightPaymentSignature() {
        assertTrue(razorpay.isGenuinePayment("order_Abc123", "pay_Xyz789", PAYMENT_SIGNATURE));
        assertFalse(razorpay.isGenuinePayment("order_Abc123", "pay_Other", PAYMENT_SIGNATURE));
        assertFalse(razorpay.isGenuinePayment("order_Other", "pay_Xyz789", PAYMENT_SIGNATURE));
        assertFalse(razorpay.isGenuinePayment("order_Abc123", "pay_Xyz789", null));
        assertFalse(new RazorpayClient(http, "https://api.razorpay.test", "rzp_test_abc", "another-secret", "")
                .isGenuinePayment("order_Abc123", "pay_Xyz789", PAYMENT_SIGNATURE));
    }

    @Test
    void acceptsOnlyTheRightWebhookSignature() {
        assertTrue(razorpay.isGenuineWebhook(WEBHOOK_BODY, WEBHOOK_SIGNATURE));
        assertFalse(razorpay.isGenuineWebhook("{\"event\": \"payment.captured\"}".getBytes(StandardCharsets.UTF_8), WEBHOOK_SIGNATURE));
        assertFalse(razorpay.isGenuineWebhook(WEBHOOK_BODY, null));
    }

    @Test
    void neverTrustsAWebhookWhenNoSecretIsSet() {
        RazorpayClient withoutSecret = new RazorpayClient(http, "https://api.razorpay.test", "rzp_test_abc", "test-key-secret", "");
        assertFalse(withoutSecret.canCheckWebhooks());
        assertFalse(withoutSecret.isGenuineWebhook(WEBHOOK_BODY, WEBHOOK_SIGNATURE));
    }

    @Test
    void createsAnOrderInPaiseWithTheServerKeys() throws Exception {
        answer(200, "{\"id\":\"order_New1\",\"status\":\"created\"}");

        assertEquals("order_New1", razorpay.createOrder(125050, "SL-2026-00100001-1", Map.of("order_number", "SL-2026-00100001")));

        HttpRequest request = sent();
        assertEquals("https://api.razorpay.test/v1/orders", request.uri().toString());
        assertEquals("POST", request.method());
        assertEquals("Basic cnpwX3Rlc3RfYWJjOnRlc3Qta2V5LXNlY3JldA==", request.headers().firstValue("Authorization").orElseThrow());
    }

    @Test
    void readsARealPaymentRecord() throws Exception {
        answer(200, """
                {"id":"pay_1","entity":"payment","amount":125050,"currency":"INR","status":"captured","order_id":"order_1",
                 "method":"upi","captured":true,"error_code":null,"error_description":null,"fee":2951}
                """);

        Payment payment = razorpay.fetchPayment("pay_1");

        assertEquals(new Payment("pay_1", "order_1", 125050, "INR", "captured", "upi", null), payment);
        assertTrue(payment.isCaptured());
    }

    @Test
    void listsTheOrdersPayments() throws Exception {
        answer(200, "{\"entity\":\"collection\",\"count\":2,\"items\":[{\"id\":\"pay_1\",\"status\":\"failed\"},{\"id\":\"pay_2\",\"status\":\"authorized\"}]}");

        List<Payment> payments = razorpay.paymentsOf("order_1");

        assertEquals("https://api.razorpay.test/v1/orders/order_1/payments", sent().uri().toString());
        assertEquals(List.of("pay_1", "pay_2"), payments.stream().map(Payment::id).toList());
        assertTrue(payments.get(1).isAuthorized());
    }

    @Test
    void aRefusalNeverRevealsTheSecret() throws Exception {
        answer(401, "{\"error\":{\"code\":\"BAD_REQUEST_ERROR\",\"description\":\"Authentication failed\"}}");

        RazorpayException failure = assertThrows(RazorpayException.class, () -> razorpay.fetchPayment("pay_1"));

        assertEquals("Razorpay refused to fetch a payment (HTTP 401).", failure.getMessage());
        assertFalse(failure.getMessage().contains("test-key-secret"));
    }

    @SuppressWarnings("unchecked")
    private void answer(int status, String body) throws Exception {
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(status);
        when(response.body()).thenReturn(body);
        doReturn(response).when(http).send(any(), any());
    }

    private HttpRequest sent() throws Exception {
        ArgumentCaptor<HttpRequest> request = ArgumentCaptor.forClass(HttpRequest.class);
        verify(http).send(request.capture(), any());
        return request.getValue();
    }
}
