package com.silvestoluxe.api.account;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Endpoints for the currently authenticated Supabase account. */
@RestController
@RequestMapping("/api/me")
public class AccountController {

    private final AccountProfileService profiles;
    private final AccountDeletionService deletion;

    public AccountController(AccountProfileService profiles, AccountDeletionService deletion) {
        this.profiles = profiles;
        this.deletion = deletion;
    }

    @GetMapping
    public AccountProfileService.CurrentUser currentUser(@AuthenticationPrincipal Jwt jwt) {
        return profiles.currentUser(jwt.getSubject());
    }

    /** Permanently deletes the signed-in customer's account (see AccountDeletionService). */
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAccount(@AuthenticationPrincipal Jwt jwt) {
        deletion.delete(jwt);
    }
}
