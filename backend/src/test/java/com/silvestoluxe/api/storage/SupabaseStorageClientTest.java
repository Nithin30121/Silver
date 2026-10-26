package com.silvestoluxe.api.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.net.http.HttpClient;
import java.net.http.HttpResponse;

import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SupabaseStorageClientTest {

    @Test
    void refusesToUploadWhenTheServerSecretIsNotConfigured() {
        SupabaseStorageClient storage = new SupabaseStorageClient(mock(HttpClient.class),
                "https://project.supabase.co", "", "product-images");

        assertThrows(SupabaseStorageException.class,
                () -> storage.upload("product/file.jpg", new byte[] { 1 }, "image/jpeg"));
    }

    @Test
    void reportsTheStatusWhenStorageRejectsAnUploadWithoutRevealingTheSecret() throws Exception {
        HttpClient httpClient = mock(HttpClient.class);
        @SuppressWarnings("unchecked")
        HttpResponse<String> rejected = mock(HttpResponse.class);
        when(rejected.statusCode()).thenReturn(400);
        when(rejected.body()).thenReturn("{\"statusCode\":\"403\",\"error\":\"Unauthorized\",\"message\":\"Invalid Compact JWS\"}");
        doReturn(rejected).when(httpClient).send(any(), any());
        SupabaseStorageClient storage = new SupabaseStorageClient(httpClient,
                "https://project.supabase.co", "server-secret", "product-images");

        SupabaseStorageException failure = assertThrows(SupabaseStorageException.class,
                () -> storage.upload("product/file.jpg", new byte[] { 1 }, "image/jpeg"));

        assertEquals("Supabase Storage rejected the upload (HTTP 400).", failure.getMessage());
        assertFalse(failure.getMessage().contains("server-secret"));
    }

    @Test
    void buildsPublicUrlsWithoutPuttingTheSecretInTheUrl() {
        SupabaseStorageClient storage = new SupabaseStorageClient(mock(HttpClient.class),
                "https://project.supabase.co/", "server-secret", "product-images");

        assertEquals("https://project.supabase.co/storage/v1/object/public/product-images/rings/front%20view.jpg",
                storage.publicUrl("rings/front view.jpg"));
    }
}
