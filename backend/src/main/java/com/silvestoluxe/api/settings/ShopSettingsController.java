package com.silvestoluxe.api.settings;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The owner's silver rate. The storefront reads it from the database directly. */
@RestController
@RequestMapping("/api/admin/settings")
@PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
public class ShopSettingsController {
    private final ShopSettingsService settings;

    public ShopSettingsController(ShopSettingsService settings) { this.settings = settings; }

    @GetMapping("/silver-rate")
    public SilverRateSettings silverRate() { return settings.silverRate(); }

    @PutMapping("/silver-rate")
    public SilverRateSettings updateSilverRate(@RequestBody @Valid SilverRateSettings.Update update) {
        return settings.updateSilverRate(update);
    }
}
