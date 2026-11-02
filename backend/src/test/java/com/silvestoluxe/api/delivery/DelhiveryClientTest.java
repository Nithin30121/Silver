package com.silvestoluxe.api.delivery;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Flow;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class DelhiveryClientTest {
    private final HttpClient http = mock(HttpClient.class);
    private final DelhiveryClient delhivery = new DelhiveryClient(http, "https://track.delhivery.test/", "test-token", "SILVORA STUDIO",
            "36ABCDE1234F1Z5", "7113", "Surface");

    @Test
    void staysOffUntilTheTokenAndPickupAddressAreSet() {
        assertFalse(new DelhiveryClient(http, "https://track.delhivery.test", "", "SILVORA STUDIO", "", "", "").isEnabled());
        assertFalse(new DelhiveryClient(http, "https://track.delhivery.test", "test-token", " ", "", "", "").isEnabled());
        assertTrue(delhivery.isEnabled());
        assertThrows(DelhiveryException.class,
                () -> new DelhiveryClient(http, "https://track.delhivery.test", "", "", "", "", "").track(List.of("DL1")));
        verifyNoInteractions(http);
    }

    @Test
    void booksInDelhiverysDocumentedFormat() throws Exception {
        answer(200, """
                {"success": true, "packages": [{"status": "Success", "waybill": "1490810000123", "refnum": "SL-2026-00100001", "remarks": []}]}""");

        String waybill = delhivery.book(parcel("Flat 4 & 5, #12 Lake Road; Hyderabad"));

        assertEquals("1490810000123", waybill);
        HttpRequest request = sent();
        assertEquals("https://track.delhivery.test/api/cmu/create.json", request.uri().toString());
        assertEquals("POST", request.method());
        assertEquals("Token test-token", request.headers().firstValue("Authorization").orElseThrow());
        String body = body(request);
        assertTrue(body.startsWith("format=json&data="));
        JsonNode data = JsonMapper.builder().build().readTree(body.substring("format=json&data=".length()));
        assertEquals("SILVORA STUDIO", data.path("pickup_location").path("name").asString());
        JsonNode shipment = data.path("shipments").path(0);
        assertEquals("SL-2026-00100001", shipment.path("order").asString());
        assertEquals("COD", shipment.path("payment_mode").asString());
        assertEquals("2500.00", shipment.path("cod_amount").asString());
        assertEquals("9000000001", shipment.path("phone").asString());
        assertEquals("500001", shipment.path("pin").asString());
        assertEquals("180", shipment.path("weight").asString());
        assertEquals("Surface", shipment.path("shipping_mode").asString());
        assertEquals("36ABCDE1234F1Z5", shipment.path("seller_gst_tin").asString());
        assertEquals("7113", shipment.path("hsn_code").asString());
        // The characters that would break Delhivery's reading of the text never reach it.
        assertEquals("Flat 4 and 5, No. 12 Lake Road Hyderabad", shipment.path("add").asString());
        assertFalse(body.substring("format=json&data=".length()).matches(".*[&#%;+].*"));
    }

    @Test
    void aRefusedBookingQuotesDelhivery() throws Exception {
        answer(200, """
                {"success": false, "rmk": "An internal error has occurred",
                 "packages": [{"status": "Fail", "waybill": "", "remarks": ["Duplicate order id"]}]}""");

        DelhiveryException refused = assertThrows(DelhiveryException.class, () -> delhivery.book(parcel("12 Lake Road")));

        assertEquals("Delhivery did not book the parcel: Duplicate order id", refused.getMessage());
    }

    @Test
    void aRejectedTokenAndAPlainTextReplyAreExplained() throws Exception {
        answer(401, "Unauthorized");
        assertTrue(assertThrows(DelhiveryException.class, () -> delhivery.track(List.of("DL1"))).getMessage().contains("DELHIVERY_API_TOKEN"));

        answer(500, "Server busy");
        assertEquals("Delhivery could not check the parcels (HTTP 500): Server busy",
                assertThrows(DelhiveryException.class, () -> delhivery.track(List.of("DL1"))).getMessage());
    }

    @Test
    void tracksSeveralParcelsInOneCallInIndianTime() throws Exception {
        answer(200, """
                {"ShipmentData": [
                  {"Shipment": {"AWB": "DL1", "ReferenceNo": "SL-1", "Status": {"Status": "Delivered", "StatusType": "DL",
                    "StatusLocation": "Imphal_MnprUnvrsty_D (Manipur)", "StatusDateTime": "2023-02-15T12:18:25.002000"}}},
                  {"Shipment": {"AWB": "DL2", "Status": {"Status": "Manifested"}}}
                ]}""");

        List<DelhiveryClient.Tracking> scans = delhivery.track(List.of("DL1", "DL2"));

        assertEquals("https://track.delhivery.test/api/v1/packages/json/?waybill=DL1%2CDL2", sent().uri().toString());
        assertEquals(new DelhiveryClient.Tracking("DL1", "Delivered", "DL", "Imphal_MnprUnvrsty_D (Manipur)",
                Instant.parse("2023-02-15T06:48:25.002Z")), scans.get(0));
        assertEquals("Manifested", scans.get(1).status());
        assertNull(scans.get(1).statusType());
        assertNull(scans.get(1).at());
    }

    @Test
    void readsWhetherAPinCodeIsServed() throws Exception {
        answer(200, """
                {"delivery_codes": [{"postal_code": {"pin": 110017, "pre_paid": "Y", "cash": "Y", "pickup": "Y"}}]}""");
        assertEquals(new DelhiveryClient.Serviceability(true, true), delhivery.serviceability("110017"));

        answer(200, """
                {"delivery_codes": [{"postal_code": {"pin": 194103, "pre_paid": "Y", "cod": "N"}}]}""");
        assertEquals(new DelhiveryClient.Serviceability(true, false), delhivery.serviceability("194103"));

        answer(200, """
                {"delivery_codes": [{"postal_code": {"pin": 194104, "pre_paid": "Y", "cod": "Y", "remarks": "Embargo"}}]}""");
        assertEquals(new DelhiveryClient.Serviceability(false, false), delhivery.serviceability("194104"));

        answer(200, "{\"delivery_codes\": []}");
        assertEquals(new DelhiveryClient.Serviceability(false, false), delhivery.serviceability("999999"));
    }

    @Test
    void cancelsAParcelAndReportsARefusal() throws Exception {
        answer(200, "{\"status\": true, \"waybill\": \"DL1\", \"remark\": \"Shipment has been cancelled.\"}");
        delhivery.cancel("DL1");
        HttpRequest request = sent();
        assertEquals("https://track.delhivery.test/api/p/edit", request.uri().toString());
        assertEquals("{\"waybill\":\"DL1\",\"cancellation\":\"true\"}", reorderedBody(request));

        answer(200, "{\"status\": false, \"waybill\": \"DL2\", \"remark\": \"Shipment is already dispatched\"}");
        assertEquals("Delhivery did not cancel the parcel: Shipment is already dispatched",
                assertThrows(DelhiveryException.class, () -> delhivery.cancel("DL2")).getMessage());
    }

    @Test
    void tracksPublicly() {
        assertEquals("https://www.delhivery.com/track/package/1490810000123", DelhiveryClient.trackingUrl("1490810000123"));
    }

    private static DelhiveryClient.Parcel parcel(String address) {
        return new DelhiveryClient.Parcel("SL-2026-00100001", "Asha Rao", "9000000001", address, "Hyderabad", "Telangana", "500001",
                true, new BigDecimal("2500.00"), new BigDecimal("2500.00"), "Silver jewellery: Moon Ring", 1, 180);
    }

    private void answer(int status, String body) throws Exception {
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(status);
        when(response.body()).thenReturn(body);
        doReturn(response).when(http).send(any(), any());
    }

    private HttpRequest sent() throws Exception {
        ArgumentCaptor<HttpRequest> request = ArgumentCaptor.forClass(HttpRequest.class);
        verify(http, org.mockito.Mockito.atLeastOnce()).send(request.capture(), any());
        return request.getValue();
    }

    /** The cancel body as JSON with its keys in a fixed order, since a map's order isn't promised. */
    private static String reorderedBody(HttpRequest request) throws Exception {
        JsonNode body = JsonMapper.builder().build().readTree(body(request));
        return "{\"waybill\":\"" + body.path("waybill").asString() + "\",\"cancellation\":\"" + body.path("cancellation").asString() + "\"}";
    }

    private static String body(HttpRequest request) throws Exception {
        StringBuilder text = new StringBuilder();
        CompletableFuture<Void> done = new CompletableFuture<>();
        request.bodyPublisher().orElseThrow().subscribe(new Flow.Subscriber<ByteBuffer>() {
            @Override public void onSubscribe(Flow.Subscription subscription) { subscription.request(Long.MAX_VALUE); }
            @Override public void onNext(ByteBuffer item) { text.append(StandardCharsets.UTF_8.decode(item)); }
            @Override public void onError(Throwable error) { done.completeExceptionally(error); }
            @Override public void onComplete() { done.complete(null); }
        });
        done.get(5, TimeUnit.SECONDS);
        return text.toString();
    }
}
