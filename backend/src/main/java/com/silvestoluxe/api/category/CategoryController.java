package com.silvestoluxe.api.category;

import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import static com.silvestoluxe.api.category.CategoryDtos.*;

@RestController
@RequestMapping("/api")
public class CategoryController {
    private final CategoryService categories;
    public CategoryController(CategoryService categories) { this.categories = categories; }

    @GetMapping("/categories")
    public List<Response> categories() { return categories.activeTree(); }

    @GetMapping("/categories/{id}")
    public Response category(@PathVariable UUID id) { return categories.byId(id); }

    @PostMapping("/admin/categories")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public Response create(@RequestBody @Valid Upsert request) { return categories.create(request); }

    @PutMapping("/admin/categories/{id}")
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public Response update(@PathVariable UUID id, @RequestBody @Valid Upsert request) { return categories.update(id, request); }

    @PatchMapping("/admin/categories/{id}/status")
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public Response status(@PathVariable UUID id, @RequestBody @Valid Status request) { return categories.updateStatus(id, request); }

    @DeleteMapping("/admin/categories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@catalogAuthorization.isAdmin(authentication)")
    public void delete(@PathVariable UUID id) { categories.delete(id); }
}
