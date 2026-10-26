package com.silvestoluxe.api.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.net.http.HttpClient;

import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.mock;

class SupabaseStorageClientTest {

    @Test
    void refusesToUploadWhenTheServerSecretIsNotConfigured() {
        SupabaseStorageClient storage = new SupabaseStorageClient(mock(HttpClient.class),
                "https://project.supabase.co", "", "product-images");

        assertThrows(SupabaseStorageException.class,
                () -> storage.upload("product/file.jpg", new byte[] { 1 }, "image/jpeg"));
    }

    @Test
    void buildsPublicUrlsWithoutPuttingTheSecretInTheUrl() {
        SupabaseStorageClient storage = new SupabaseStorageClient(mock(HttpClient.class),
                "https://project.supabase.co/", "server-secret", "product-images");

        assertEquals("https://project.supabase.co/storage/v1/object/public/product-images/rings/front%20view.jpg",
                storage.publicUrl("rings/front view.jpg"));
    }
}
