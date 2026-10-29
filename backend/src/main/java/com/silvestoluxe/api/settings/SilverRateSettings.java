package com.silvestoluxe.api.settings;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;

/**
 * The silver rate the owner sets for the storefront's rate bar. The storefront reads the same row
 * straight from the database (shop_settings).
 *
 * @param ratePerGram the rate in rupees per gram, or null when none is set
 * @param rateSetAt   when the owner last set it; null when there is none
 */
public record SilverRateSettings(BigDecimal ratePerGram, Instant rateSetAt) {

    /** ratePerGram is the new rate, or null to remove it and hide the rate bar. */
    public record Update(
            @DecimalMin(value = "10", message = "The rate must be at least ₹10 per gram.")
            @DecimalMax(value = "5000", message = "The rate must be at most ₹5,000 per gram.")
            @Digits(integer = 4, fraction = 2, message = "Use at most two decimal places.")
            BigDecimal ratePerGram) { }
}
