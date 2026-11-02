package com.silvestoluxe.api.delivery;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Minimal server-only client for Delhivery's parcel API. Booking stays off until the server has an API token and the
 * name of the pickup address registered in Delhivery One. The token is a server-only secret, like the database password.
 */
@Component
public class DelhiveryClient {
    private static final Logger log = LoggerFactory.getLogger(DelhiveryClient.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(20);
    private static final JsonMapper JSON = JsonMapper.builder().build();
    /** Delhivery's scan times are Indian local times with no zone. */
    private static final ZoneId DELHIVERY_TIME = ZoneId.of("Asia/Kolkata");
    /** Delhivery reads a booking as the text after "data=", so these characters would cut it short or change it. */
    private static final Pattern UNSAFE = Pattern.compile("[&#%;\\\\+]");

    private final HttpClient httpClient;
    private final String apiUrl;
    private final String token;
    private final String pickupLocation;
    private final String sellerGst;
    private final String hsnCode;
    private final String shippingMode;

    @Autowired
    public DelhiveryClient(@Value("${app.delhivery.api-url:https://track.delhivery.com}") String apiUrl,
                           @Value("${app.delhivery.api-token:}") String token,
                           @Value("${app.delhivery.pickup-location:}") String pickupLocation,
                           @Value("${app.delhivery.seller-gst:}") String sellerGst,
                           @Value("${app.delhivery.hsn-code:}") String hsnCode,
                           @Value("${app.delhivery.shipping-mode:Surface}") String shippingMode) {
        this(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build(), apiUrl, token, pickupLocation, sellerGst, hsnCode, shippingMode);
    }

    DelhiveryClient(HttpClient httpClient, String apiUrl, String token, String pickupLocation, String sellerGst, String hsnCode,
                    String shippingMode) {
        this.httpClient = httpClient;
        this.apiUrl = apiUrl.trim().replaceFirst("/+$", "");
        this.token = trimmed(token);
        this.pickupLocation = trimmed(pickupLocation);
        this.sellerGst = trimmed(sellerGst);
        this.hsnCode = trimmed(hsnCode);
        this.shippingMode = trimmed(shippingMode).isEmpty() ? "Surface" : trimmed(shippingMode);
    }

    public boolean isEnabled() { return !token.isBlank() && !pickupLocation.isBlank(); }

    /** Delhivery's public tracking page for a parcel; it needs no sign-in. */
    public static String trackingUrl(String waybill) {
        return "https://www.delhivery.com/track/package/" + URLEncoder.encode(waybill, StandardCharsets.UTF_8);
    }

    /** Books one parcel to be collected from the shop's registered pickup address, and returns its tracking number. */
    public String book(Parcel parcel) {
        Map<String, Object> shipment = new LinkedHashMap<>();
        shipment.put("name", safe(parcel.name()));
        shipment.put("add", safe(parcel.address()));
        shipment.put("pin", parcel.pin());
        shipment.put("city", safe(parcel.city()));
        shipment.put("state", safe(parcel.state()));
        shipment.put("country", "India");
        shipment.put("phone", parcel.phone());
        shipment.put("order", safe(parcel.reference()));
        shipment.put("payment_mode", parcel.cashOnDelivery() ? "COD" : "Prepaid");
        shipment.put("cod_amount", parcel.cashOnDelivery() ? parcel.codAmount().toPlainString() : "0");
        shipment.put("total_amount", parcel.totalAmount().toPlainString());
        shipment.put("products_desc", safe(parcel.description()));
        shipment.put("quantity", String.valueOf(parcel.quantity()));
        shipment.put("weight", String.valueOf(parcel.weightGrams()));
        shipment.put("shipping_mode", shippingMode);
        shipment.put("address_type", "home");
        shipment.put("waybill", "");
        if (!sellerGst.isEmpty()) shipment.put("seller_gst_tin", sellerGst);
        if (!hsnCode.isEmpty()) shipment.put("hsn_code", hsnCode);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("shipments", List.of(shipment));
        body.put("pickup_location", Map.of("name", pickupLocation));

        // Delhivery's documented format: the JSON after "format=json&data=", sent as is.
        JsonNode reply = send(post("/api/cmu/create.json", "format=json&data=" + JSON.writeValueAsString(body)), "book the parcel");
        JsonNode accepted = reply.path("packages").path(0);
        String waybill = text(accepted, "waybill");
        if (waybill != null && !waybill.isBlank() && "success".equalsIgnoreCase(text(accepted, "status"))) return waybill.trim();
        throw new DelhiveryException("Delhivery did not book the parcel: " + refusal(reply, accepted));
    }

    /** The latest scan of each parcel Delhivery knows; ones it doesn't know are left out. */
    public List<Tracking> track(List<String> waybills) {
        String query = URLEncoder.encode(String.join(",", waybills), StandardCharsets.UTF_8);
        JsonNode reply = send(get("/api/v1/packages/json/?waybill=" + query), "check the parcels");
        List<Tracking> found = new ArrayList<>();
        reply.path("ShipmentData").forEach(entry -> {
            JsonNode shipment = entry.path("Shipment");
            JsonNode status = shipment.path("Status");
            String waybill = text(shipment, "AWB");
            if (waybill == null) return;
            found.add(new Tracking(waybill.trim(), text(status, "Status"), text(status, "StatusType"),
                    text(status, "StatusLocation"), scanTime(text(status, "StatusDateTime"))));
        });
        return found;
    }

    /** Whether Delhivery delivers to a PIN code, for prepaid parcels and for cash on delivery. */
    public Serviceability serviceability(String pin) {
        JsonNode reply = send(get("/c/api/pin-codes/json/?filter_codes=" + URLEncoder.encode(pin, StandardCharsets.UTF_8)),
                "check the PIN code");
        JsonNode code = reply.path("delivery_codes").path(0).path("postal_code");
        if (code.isMissingNode() || code.isNull()) return new Serviceability(false, false);
        String remark = (Objects.toString(text(code, "remarks"), "") + " " + Objects.toString(text(code, "remark"), "")).toLowerCase(Locale.ROOT);
        if (remark.contains("embargo")) return new Serviceability(false, false);
        boolean prepaid = yes(text(code, "pre_paid"));
        boolean cash = yes(text(code, "cod")) || yes(text(code, "cash"));
        return new Serviceability(prepaid || cash, cash);
    }

    /** Cancels a parcel before it reaches the customer. Delhivery allows it until the parcel is out for delivery. */
    public void cancel(String waybill) {
        String body = JSON.writeValueAsString(Map.of("waybill", waybill, "cancellation", "true"));
        JsonNode reply = send(post("/api/p/edit", body), "cancel the parcel");
        JsonNode status = reply.get("status");
        boolean refused = (status != null && (status.isBoolean() ? !status.asBoolean() : "false".equalsIgnoreCase(status.asString())))
                || (reply.hasNonNull("error") && !(reply.get("error").isBoolean() && !reply.get("error").asBoolean()));
        if (refused) throw new DelhiveryException("Delhivery did not cancel the parcel: " + refusal(reply, reply));
    }

    private HttpRequest.Builder request(String path) {
        return HttpRequest.newBuilder(URI.create(apiUrl + path)).timeout(TIMEOUT)
                .header("Authorization", "Token " + token).header("Accept", "application/json");
    }

    private HttpRequest get(String path) { return request(path).GET().build(); }

    /** Delhivery's examples send both the booking text and plain JSON with a JSON content type. */
    private HttpRequest post(String path, String body) {
        return request(path).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8)).build();
    }

    private JsonNode send(HttpRequest request, String action) {
        if (!isEnabled()) throw new DelhiveryException("Delhivery isn't set up yet.");
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status == 401 || status == 403) {
                log.warn("Delhivery refused the API token when trying to {} (HTTP {}).", action, status);
                throw new DelhiveryException("Delhivery refused the API token. Check DELHIVERY_API_TOKEN on Render.");
            }
            JsonNode reply = parse(response.body());
            if (status / 100 != 2) {
                log.warn("Delhivery refused to {} (HTTP {}).", action, status);
                throw new DelhiveryException("Delhivery could not " + action + " (HTTP " + status + "): " + refusal(reply, reply));
            }
            return reply;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new DelhiveryException("Interrupted while contacting Delhivery.", exception);
        } catch (IOException exception) {
            log.warn("Could not {} with Delhivery ({}).", action, exception.getClass().getSimpleName());
            throw new DelhiveryException("Delhivery could not be reached. Please try again.", exception);
        }
    }

    /** Delhivery sometimes answers in plain text, so a reply that isn't JSON is kept as a message. */
    private static JsonNode parse(String body) {
        if (body == null || body.isBlank()) return JSON.createObjectNode();
        try {
            return JSON.readTree(body);
        } catch (JacksonException exception) {
            return JSON.createObjectNode().put("rmk", body.length() > 300 ? body.substring(0, 300) : body);
        }
    }

    /** Delhivery's own words for a refusal, from the parcel's remarks or the reply's message fields. */
    private static String refusal(JsonNode reply, JsonNode parcel) {
        List<String> remarks = new ArrayList<>();
        JsonNode parcelRemarks = parcel.path("remarks");
        if (parcelRemarks.isArray()) parcelRemarks.forEach(remark -> addRemark(remarks, remark.asString()));
        else addRemark(remarks, text(parcel, "remarks"));
        for (String field : List.of("rmk", "remark", "error", "message", "Error")) {
            if (remarks.isEmpty() && reply.hasNonNull(field) && !reply.get(field).isBoolean()) addRemark(remarks, reply.get(field).asString());
        }
        return remarks.isEmpty() ? "no reason was given." : String.join(" ", remarks);
    }

    private static void addRemark(List<String> remarks, String remark) {
        if (remark != null && !remark.isBlank()) remarks.add(remark.trim());
    }

    private static Instant scanTime(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDateTime.parse(value.trim()).atZone(DELHIVERY_TIME).toInstant();
        } catch (DateTimeParseException exception) {
            return null;
        }
    }

    private static boolean yes(String flag) { return flag != null && (flag.equalsIgnoreCase("y") || flag.equalsIgnoreCase("true")); }

    static String safe(String value) {
        if (value == null) return "";
        return UNSAFE.matcher(value.replace("&", " and ").replace("#", " No. ").replace("%", " percent "))
                .replaceAll(" ").replaceAll("\\s+", " ").trim();
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() || value.isMissingNode() ? null : value.asString();
    }

    private static String trimmed(String value) { return value == null ? "" : value.trim(); }

    /** One parcel to book. The phone is 10 digits and the PIN code 6; the code amount is collected only for cash on delivery. */
    public record Parcel(String reference, String name, String phone, String address, String city, String state, String pin,
                         boolean cashOnDelivery, BigDecimal codAmount, BigDecimal totalAmount, String description, int quantity,
                         int weightGrams) { }

    /** Delhivery's latest scan of a parcel, as it reported it. */
    public record Tracking(String waybill, String status, String statusType, String location, Instant at) { }

    public record Serviceability(boolean serviceable, boolean cashOnDelivery) { }
}
