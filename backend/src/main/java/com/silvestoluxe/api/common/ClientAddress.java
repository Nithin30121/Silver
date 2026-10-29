package com.silvestoluxe.api.common;

import jakarta.servlet.http.HttpServletRequest;

/** Where a request came from, for rate limits. It is kept in memory only and never stored. */
public final class ClientAddress {
    private ClientAddress() { }

    /**
     * Hosts such as Render put the visitor's address first in X-Forwarded-For. It can be faked,
     * which is why each limit that uses it also has a shop-wide cap.
     */
    public static String of(HttpServletRequest http) {
        String forwarded = http.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) return forwarded.split(",")[0].trim();
        return http.getRemoteAddr();
    }
}
