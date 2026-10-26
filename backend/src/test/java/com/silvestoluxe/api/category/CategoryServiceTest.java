package com.silvestoluxe.api.category;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class CategoryServiceTest {

    @Test
    void publicLookupHidesAnInactiveCategory() {
        CategoryRepository repository = org.mockito.Mockito.mock(CategoryRepository.class);
        Category category = category(false);
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.of(category));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> new CategoryService(repository).activeById(id));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
    }

    @Test
    void administratorTreeIncludesInactiveCategories() {
        CategoryRepository repository = org.mockito.Mockito.mock(CategoryRepository.class);
        Category inactive = category(false);
        Category active = category(true);
        when(repository.findAllByOrderByDisplayOrderAscNameAsc()).thenReturn(List.of(inactive, active));

        List<CategoryDtos.Response> tree = new CategoryService(repository).allTree();

        assertEquals(2, tree.size());
        assertEquals(List.of(false, true), tree.stream().map(CategoryDtos.Response::isActive).toList());
    }

    private Category category(boolean active) {
        Category category = new Category();
        category.setName(active ? "Active" : "Inactive");
        category.setSlug(active ? "active" : "inactive");
        category.setCategoryType("collection");
        category.setDescription("");
        category.setDisplayOrder(active ? 1 : 0);
        category.setActive(active);
        return category;
    }
}
