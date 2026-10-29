package com.silvestoluxe.api.interest;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Component;

/**
 * Keeps wishlist counts honest: each visitor counts once per piece per day, a visitor counts for a
 * bounded number of pieces a day, and the whole shop counts a bounded number of adds a day, so
 * clicking repeatedly or faking addresses can't inflate the numbers. Addresses live in memory only,
 * are forgotten at the end of each day, and reset on restart.
 */
@Component
public class WishlistAddLimiter {
    static final int PER_VISITOR_PER_DAY = 50;
    static final int SHOP_WIDE_PER_DAY = 20_000;

    private LocalDate day;
    private final Set<String> counted = new HashSet<>();
    private final Map<String, Integer> byVisitor = new HashMap<>();

    /** True, and remembered, when this visitor's add of this piece today should be counted. */
    public synchronized boolean shouldCount(String visitor, UUID productId, LocalDate today) {
        if (!today.equals(day)) {
            day = today;
            counted.clear();
            byVisitor.clear();
        }
        if (counted.size() >= SHOP_WIDE_PER_DAY) return false;
        if (byVisitor.getOrDefault(visitor, 0) >= PER_VISITOR_PER_DAY) return false;
        if (!counted.add(visitor + '|' + productId)) return false;
        byVisitor.merge(visitor, 1, Integer::sum);
        return true;
    }
}
