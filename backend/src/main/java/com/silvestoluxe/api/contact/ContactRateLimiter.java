package com.silvestoluxe.api.contact;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Keeps the public contact form from being used to flood the shop. Each sender gets a few messages
 * per quarter hour, and the whole shop accepts a bounded number per hour, so even a sender who
 * disguises where they come from can't fill the inbox. Counts live in memory and reset on restart.
 */
@Component
public class ContactRateLimiter {
    static final int PER_SENDER = 5;
    static final Duration SENDER_WINDOW = Duration.ofMinutes(15);
    static final int SHOP_WIDE = 60;
    static final Duration SHOP_WINDOW = Duration.ofHours(1);

    private final Map<String, Deque<Instant>> bySender = new HashMap<>();
    private final Deque<Instant> all = new ArrayDeque<>();
    private final Clock clock;

    @Autowired
    public ContactRateLimiter() { this(Clock.systemUTC()); }

    ContactRateLimiter(Clock clock) { this.clock = clock; }

    /** True, and counted, when this sender may send another message now. */
    public synchronized boolean tryAcquire(String sender) {
        Instant now = clock.instant();
        expire(all, now.minus(SHOP_WINDOW));
        if (all.size() >= SHOP_WIDE) return false;
        Deque<Instant> recent = bySender.get(sender);
        if (recent != null) expire(recent, now.minus(SENDER_WINDOW));
        if (recent != null && recent.size() >= PER_SENDER) return false;
        if (recent == null) {
            if (bySender.size() > 500) bySender.values().removeIf((times) -> {
                expire(times, now.minus(SENDER_WINDOW));
                return times.isEmpty();
            });
            recent = new ArrayDeque<>();
            bySender.put(sender, recent);
        }
        recent.addLast(now);
        all.addLast(now);
        return true;
    }

    private static void expire(Deque<Instant> times, Instant before) {
        while (!times.isEmpty() && times.peekFirst().isBefore(before)) times.removeFirst();
    }
}
