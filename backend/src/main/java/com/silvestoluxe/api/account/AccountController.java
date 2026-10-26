package com.silvestoluxe.api.account;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Endpoints for the currently authenticated Supabase account. */
@RestController
@RequestMapping("/api/me")
public class AccountController {

    private final AccountProfileService profiles;

    public AccountController(AccountProfileService profiles) {
        this.profiles = profiles;
    }

    @GetMapping
    public AccountProfileService.CurrentUser currentUser(@AuthenticationPrincipal Jwt jwt) {
        return profiles.currentUser(jwt.getSubject());
    }
}
