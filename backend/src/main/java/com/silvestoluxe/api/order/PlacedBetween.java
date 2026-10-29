package com.silvestoluxe.api.order;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * When orders were placed, for the admin order list and its download: from the start of one day up
 * to, but not including, the start of the day after another. Either end may be left open.
 *
 * @param from  the earliest moment included, or null for no lower limit
 * @param until the first moment no longer included, or null for no upper limit
 */
public record PlacedBetween(Instant from, Instant until) {
    public static final PlacedBetween ANY = new PlacedBetween(null, null);

    /** Both days are included and counted in the shop's time zone, as on the sales chart. */
    public static PlacedBetween days(LocalDate from, LocalDate to, ZoneId zone) {
        if (from != null && to != null && to.isBefore(from)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The start date must be on or before the end date.");
        }
        return new PlacedBetween(from == null ? null : from.atStartOfDay(zone).toInstant(),
                to == null ? null : to.plusDays(1).atStartOfDay(zone).toInstant());
    }
}
