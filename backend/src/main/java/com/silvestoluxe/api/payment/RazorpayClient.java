package com.silvestoluxe.api.payment;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Minimal server-only client for Razorpay. Online payments stay off until the server has a key id and
 * key secret. Both secrets are server-only, like the database password; only the key id reaches browsers.
 */
@Component
public class RazorpayClient {
    private static final Logger log = LoggerFactory.getLogger(RazorpayClient.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(15);
    private static final JsonMapper JSON = JsonMapper.builder().build();

    private final HttpClient httpClient;
    private final String apiUrl;
    private final String keyId;
    private final String keySecret;
    private final String webhookSecret;

    @Autowired
    public RazorpayClient(@Value("${app.razorpay.api-url:https://api.razorpay.com}") String apiUrl,
                          @Value("${app.razorpay.key-id:}") String keyId,
                          @Value("${app.razorpay.key-secret:}") String keySecret,
                          @Value("${app.razorpay.webhook-secret:}") String webhookSecret) {
        this(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build(), apiUrl, keyId, keySecret, webhookSecret);
    }

    RazorpayClient(HttpClient httpClient, String apiUrl, String keyId, String keySecret, String webhookSecret) {
        this.httpClient = httpClient;
        this.apiUrl = apiUrl.trim().replaceFirst("/+$", "");
        this.keyId = keyId == null ? "" : keyId.trim();
        this.keySecret = keySecret == null ? "" : keySecret.trim();
        this.webhookSecret = webhookSecret == null ? "" : webhookSecret.trim();
    }

    public boolean isEnabled() { return !keyId.isBlank() && !keySecret.isBlank(); }
    public boolean canCheckWebhooks() { return !webhookSecret.isBlank(); }
    public String keyId() { return keyId; }

    /** Tells Razorpay to expect one payment of this amount, and returns the id its payment window needs. */
    public String createOrder(long amountInPaise, String receipt, Map<String, String> notes) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("amount", amountInPaise);
        body.put("currency", "INR");
        body.put("receipt", receipt);
        body.put("notes", notes);
        JsonNode order = send(post("/v1/orders", body), "create an order");
        String id = text(order, "id");
        if (id == null) throw new RazorpayException("Razorpay did not return an order id.");
        return id;
    }

    public Payment fetchPayment(String paymentId) {
        return Payment.from(send(get("/v1/payments/" + paymentId), "fetch a payment"));
    }

    /** Payments stay "authorized" when the Razorpay account is set to capture by hand. */
    public Payment capture(Payment payment) {
        return Payment.from(send(post("/v1/payments/" + payment.id() + "/capture",
                Map.of("amount", payment.amountInPaise(), "currency", payment.currency())), "capture a payment"));
    }

    /** Every payment tried against one Razorpay order, so a missed confirmation can be caught up on. */
    public List<Payment> paymentsOf(String razorpayOrderId) {
        List<Payment> payments = new ArrayList<>();
        send(get("/v1/orders/" + razorpayOrderId + "/payments"), "list an order's payments")
                .path("items").forEach(item -> payments.add(Payment.from(item)));
        return payments;
    }

    /** Checks the proof Razorpay's window hands the browser. The order id must be the one this server stored. */
    public boolean isGenuinePayment(String razorpayOrderId, String paymentId, String signature) {
        if (keySecret.isBlank()) return false;
        byte[] signed = (razorpayOrderId + "|" + paymentId).getBytes(StandardCharsets.UTF_8);
        return matches(signature, sign(signed, keySecret));
    }

    /** Checks the signature over the exact bytes received; parsing the body first would change them. */
    public boolean isGenuineWebhook(byte[] body, String signature) {
        return canCheckWebhooks() && matches(signature, sign(body, webhookSecret));
    }

    private static boolean matches(String signature, String expected) {
        return signature != null && MessageDigest.isEqual(signature.getBytes(StandardCharsets.UTF_8), expected.getBytes(StandardCharsets.UTF_8));
    }

    private static String sign(byte[] message, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(message));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("HMAC-SHA256 is unavailable.", exception);
        }
    }

    private HttpRequest.Builder request(String path) {
        String credentials = Base64.getEncoder().encodeToString((keyId + ":" + keySecret).getBytes(StandardCharsets.UTF_8));
        return HttpRequest.newBuilder(URI.create(apiUrl + path)).timeout(TIMEOUT)
                .header("Authorization", "Basic " + credentials).header("Accept", "application/json");
    }

    private HttpRequest get(String path) { return request(path).GET().build(); }

    private HttpRequest post(String path, Object body) {
        return request(path).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(body), StandardCharsets.UTF_8)).build();
    }

    private JsonNode send(HttpRequest request, String action) {
        if (!isEnabled()) throw new RazorpayException("Razorpay is not configured.");
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                log.warn("Razorpay refused to {} (HTTP {}).", action, response.statusCode());
                throw new RazorpayException("Razorpay refused to " + action + " (HTTP " + response.statusCode() + ").");
            }
            return JSON.readTree(response.body());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new RazorpayException("Interrupted while contacting Razorpay.", exception);
        } catch (IOException | JacksonException exception) {
            log.warn("Could not {} with Razorpay ({}).", action, exception.getClass().getSimpleName());
            throw new RazorpayException("Could not " + action + " with Razorpay.", exception);
        }
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asString();
    }

    /** The parts of Razorpay's payment record this shop uses; failureReason is shown to the owner only. */
    public record Payment(String id, String razorpayOrderId, long amountInPaise, String currency, String status,
                          String method, String failureReason) {
        public static Payment from(JsonNode entity) {
            return new Payment(text(entity, "id"), text(entity, "order_id"), entity.path("amount").asLong(0),
                    text(entity, "currency"), text(entity, "status"), text(entity, "method"), text(entity, "error_description"));
        }

        public boolean isCaptured() { return "captured".equals(status); }
        public boolean isAuthorized() { return "authorized".equals(status); }
    }
}
