package com.silvestoluxe.api.account;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Server-only client for Supabase Auth's admin API, used to delete a customer's sign-in when they
 * delete their account. It uses the project's secret key, which never leaves the backend.
 */
@Component
public class SupabaseAuthAdminClient {
    private static final Logger log = LoggerFactory.getLogger(SupabaseAuthAdminClient.class);

    private final HttpClient httpClient;
    private final String projectUrl;
    private final String secretKey;

    /** The Storage secret key is the same project secret, so existing servers need no new setting. */
    @Autowired
    public SupabaseAuthAdminClient(
            @Value("${SUPABASE_URL:}") String projectUrl,
            @Value("${SUPABASE_SECRET_KEY:${SUPABASE_STORAGE_SECRET_KEY:}}") String secretKey) {
        this(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build(), projectUrl, secretKey);
    }

    SupabaseAuthAdminClient(HttpClient httpClient, String projectUrl, String secretKey) {
        this.httpClient = httpClient;
        this.projectUrl = projectUrl == null ? "" : projectUrl.trim().replaceFirst("/+$", "");
        this.secretKey = secretKey == null ? "" : secretKey.trim();
    }

    /**
     * Deletes the Supabase Auth user. The database then removes their profile and saved addresses
     * and detaches their past orders (see the V6 migration). A user who is already gone counts as deleted.
     */
    public void deleteUser(UUID userId) {
        if (projectUrl.isBlank() || secretKey.isBlank()) {
            log.warn("Account deletion is not configured: SUPABASE_URL set = {}, secret key set = {}",
                    !projectUrl.isBlank(), !secretKey.isBlank());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Account deletion isn't available right now. Please contact us and we'll delete your account for you.");
        }
        HttpRequest request = HttpRequest.newBuilder(URI.create(projectUrl + "/auth/v1/admin/users/" + userId))
                .timeout(Duration.ofSeconds(30))
                .header("Authorization", "Bearer " + secretKey)
                .header("apikey", secretKey)
                .DELETE()
                .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status == 404 || (status >= 200 && status < 300)) return;
            log.warn("Supabase Auth refused to delete a user: HTTP {} {}", status, summary(response.body()));
        } catch (IOException exception) {
            log.warn("Supabase Auth could not be reached to delete a user: {}", exception.toString());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "We couldn't delete your account just now. Please try again in a few minutes.");
    }

    private static String summary(String body) {
        if (body == null || body.isBlank()) return "(no details)";
        String singleLine = body.replaceAll("\\s+", " ").trim();
        return singleLine.length() > 300 ? singleLine.substring(0, 300) + "…" : singleLine;
    }
}
