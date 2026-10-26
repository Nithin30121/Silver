package com.silvestoluxe.api.config;

import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.ECDSASigner;
import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.ECKey;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.KeyUse;
import com.nimbusds.jose.jwk.gen.ECKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;

/**
 * A local stand-in for a Supabase project's public JWKS endpoint, plus access tokens signed the
 * way Supabase signs them by default (ES256 with an ECC P-256 key).
 */
final class TestJwks {
    static final ECKey SUPABASE_KEY = es256Key("supabase-signing-key");
    private static final HttpServer SERVER = serve(new JWKSet(SUPABASE_KEY.toPublicJWK()));

    private TestJwks() { }

    static String jwksUrl() {
        return "http://127.0.0.1:" + SERVER.getAddress().getPort() + "/auth/v1/.well-known/jwks.json";
    }

    static ECKey es256Key(String keyId) {
        try {
            return new ECKeyGenerator(Curve.P_256).keyID(keyId).algorithm(JWSAlgorithm.ES256)
                    .keyUse(KeyUse.SIGNATURE).generate();
        } catch (JOSEException exception) {
            throw new IllegalStateException(exception);
        }
    }

    static String accessToken(ECKey signingKey, String subject) {
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject(subject)
                .issuer("https://project-ref.supabase.co/auth/v1")
                .audience("authenticated")
                .claim("role", "authenticated")
                .issueTime(new Date())
                .expirationTime(Date.from(Instant.now().plusSeconds(600)))
                .build();
        SignedJWT token = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.ES256)
                .keyID(signingKey.getKeyID()).type(JOSEObjectType.JWT).build(), claims);
        try {
            token.sign(new ECDSASigner(signingKey));
        } catch (JOSEException exception) {
            throw new IllegalStateException(exception);
        }
        return token.serialize();
    }

    private static HttpServer serve(JWKSet publicKeys) {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            byte[] body = publicKeys.toString().getBytes(StandardCharsets.UTF_8);
            server.createContext("/auth/v1/.well-known/jwks.json", exchange -> {
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, body.length);
                try (OutputStream response = exchange.getResponseBody()) {
                    response.write(body);
                }
            });
            server.start();
            return server;
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
