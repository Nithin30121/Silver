package com.silvestoluxe.api.customer;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Admin-only customer directory shapes. Credentials and Auth metadata stay in Supabase Auth. */
public final class CustomerDtos {
    private CustomerDtos() { }

    /** orderValue excludes cancelled orders; no payment provider exists, so it is not money received. */
    public record Summary(UUID id, String fullName, String email, String role, Instant joinedAt,
                          long orderCount, BigDecimal orderValue, Instant lastOrderAt) { }
}
