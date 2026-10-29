package com.silvestoluxe.api.interest;

import java.util.List;
import java.util.UUID;

import com.silvestoluxe.api.common.ClientAddress;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ProductInterestController {
    private final ProductInterestService interest;

    public ProductInterestController(ProductInterestService interest) { this.interest = interest; }

    /** Open to everyone, signed in or not; nothing about the visitor is stored. */
    @PostMapping("/products/{id}/wishlist-adds")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void wishlistAdd(@PathVariable UUID id, HttpServletRequest http) {
        interest.recordWishlistAdd(id, ClientAddress.of(http));
    }

    @GetMapping("/admin/wishlist-counts")
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public List<ProductInterestService.WishlistCount> wishlistCounts() { return interest.wishlistCounts(); }
}
