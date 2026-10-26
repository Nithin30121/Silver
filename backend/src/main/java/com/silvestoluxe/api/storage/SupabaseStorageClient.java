package com.silvestoluxe.api.storage;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/** Minimal server-only client for the Supabase Storage REST API. */
@Component
public class SupabaseStorageClient {
    private final HttpClient httpClient;
    private final String projectUrl;
    private final String serviceKey;
    private final String bucket;

    @Autowired
    public SupabaseStorageClient(
            @Value("${SUPABASE_URL:}") String projectUrl,
            @Value("${SUPABASE_STORAGE_SECRET_KEY:}") String serviceKey,
            @Value("${app.storage.product-images.bucket:product-images}") String bucket) {
        this(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build(), projectUrl, serviceKey, bucket);
    }

    SupabaseStorageClient(HttpClient httpClient, String projectUrl, String serviceKey, String bucket) {
        this.httpClient = httpClient;
        this.projectUrl = removeTrailingSlash(projectUrl);
        this.serviceKey = serviceKey == null ? "" : serviceKey.trim();
        this.bucket = bucket;
    }

    public void upload(String path, byte[] content, String contentType) {
        requireConfiguration();
        HttpRequest request = baseRequest("/storage/v1/object/" + bucket + "/" + encodePath(path))
                .header("Content-Type", contentType)
                .header("x-upsert", "false")
                .POST(HttpRequest.BodyPublishers.ofByteArray(content))
                .build();
        send(request, "upload");
    }

    public void delete(String path) {
        requireConfiguration();
        String body = "{\"prefixes\":[\"" + jsonEscape(path) + "\"]}";
        HttpRequest request = baseRequest("/storage/v1/object/" + bucket)
                .header("Content-Type", "application/json")
                .method("DELETE", HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build();
        send(request, "delete");
    }

    public String publicUrl(String path) {
        if (projectUrl.isBlank()) throw new SupabaseStorageException("Supabase Storage is not configured.");
        return projectUrl + "/storage/v1/object/public/" + bucket + "/" + encodePath(path);
    }

    private HttpRequest.Builder baseRequest(String path) {
        return HttpRequest.newBuilder(URI.create(projectUrl + path))
                .timeout(Duration.ofSeconds(30))
                .header("Authorization", "Bearer " + serviceKey)
                .header("apikey", serviceKey);
    }

    private void send(HttpRequest request, String operation) {
        try {
            HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new SupabaseStorageException("Image storage " + operation + " failed.");
            }
        } catch (IOException exception) {
            throw new SupabaseStorageException("Image storage " + operation + " failed.", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new SupabaseStorageException("Image storage " + operation + " was interrupted.", exception);
        }
    }

    private void requireConfiguration() {
        if (projectUrl.isBlank() || serviceKey.isBlank()) {
            throw new SupabaseStorageException("Image storage is not configured.");
        }
    }

    private static String removeTrailingSlash(String value) {
        if (value == null) return "";
        return value.trim().replaceFirst("/+$", "");
    }

    private static String encodePath(String path) {
        return String.join("/", List.of(path.split("/", -1)).stream()
                .map(segment -> URLEncoder.encode(segment, StandardCharsets.UTF_8).replace("+", "%20"))
                .toList());
    }

    private static String jsonEscape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
