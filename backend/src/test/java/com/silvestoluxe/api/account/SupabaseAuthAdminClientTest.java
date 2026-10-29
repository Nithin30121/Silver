package com.silvestoluxe.api.account;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class SupabaseAuthAdminClientTest {
    private final UUID userId = UUID.randomUUID();

    @Test
    void deletesTheUserWithTheSecretOnlyInHeaders() throws Exception {
        HttpClient httpClient = respondingWith(200, "{}");

        new SupabaseAuthAdminClient(httpClient, "https://project.supabase.co/", "server-secret").deleteUser(userId);

        ArgumentCaptor<HttpRequest> request = ArgumentCaptor.forClass(HttpRequest.class);
        verify(httpClient).send(request.capture(), any());
        assertEquals("DELETE", request.getValue().method());
        assertEquals("https://project.supabase.co/auth/v1/admin/users/" + userId, request.getValue().uri().toString());
        assertEquals("server-secret", request.getValue().headers().firstValue("apikey").orElseThrow());
        assertEquals("Bearer server-secret", request.getValue().headers().firstValue("Authorization").orElseThrow());
    }

    @Test
    void aUserWhoIsAlreadyGoneCountsAsDeleted() throws Exception {
        assertDoesNotThrow(() -> new SupabaseAuthAdminClient(respondingWith(404, "{\"msg\":\"User not found\"}"),
                "https://project.supabase.co", "server-secret").deleteUser(userId));
    }

    @Test
    void reportsAFailureWithoutRevealingTheSecret() throws Exception {
        SupabaseAuthAdminClient client = new SupabaseAuthAdminClient(respondingWith(500, "{\"msg\":\"Database error deleting user\"}"),
                "https://project.supabase.co", "server-secret");

        ResponseStatusException failure = assertThrows(ResponseStatusException.class, () -> client.deleteUser(userId));

        assertEquals(HttpStatus.BAD_GATEWAY, failure.getStatusCode());
        assertFalse(failure.getReason().contains("server-secret"));
    }

    @Test
    void saysSoWhenTheServerHasNoSecretKey() {
        HttpClient httpClient = mock(HttpClient.class);

        ResponseStatusException failure = assertThrows(ResponseStatusException.class,
                () -> new SupabaseAuthAdminClient(httpClient, "https://project.supabase.co", " ").deleteUser(userId));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, failure.getStatusCode());
        verifyNoInteractions(httpClient);
    }

    private static HttpClient respondingWith(int status, String body) throws Exception {
        HttpClient httpClient = mock(HttpClient.class);
        @SuppressWarnings("unchecked")
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(status);
        when(response.body()).thenReturn(body);
        doReturn(response).when(httpClient).send(any(), any());
        return httpClient;
    }
}
