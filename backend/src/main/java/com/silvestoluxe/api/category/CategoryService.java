package com.silvestoluxe.api.category;

import static com.silvestoluxe.api.category.CategoryDtos.*;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class CategoryService {
    private final CategoryRepository categories;

    public CategoryService(CategoryRepository categories) { this.categories = categories; }

    public List<Response> activeTree() { return asTree(categories.findByIsActiveTrueOrderByDisplayOrderAscNameAsc()); }

    /** The storefront must never receive categories that an administrator has unpublished. */
    public Response activeById(UUID id) {
        Category category = find(id);
        if (!category.isActive()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found.");
        }
        return toResponse(category, List.of());
    }

    /** Administrators need inactive entries in order to manage their taxonomy. */
    public List<Response> allTree() { return asTree(categories.findAllByOrderByDisplayOrderAscNameAsc()); }

    public Response byId(UUID id) { return toResponse(find(id), List.of()); }

    @Transactional
    public Response create(Upsert request) {
        Category category = new Category();
        apply(category, request);
        return toResponse(categories.save(category), List.of());
    }

    @Transactional
    public Response update(UUID id, Upsert request) {
        Category category = find(id);
        apply(category, request);
        return toResponse(category, List.of());
    }

    @Transactional
    public Response updateStatus(UUID id, Status request) {
        Category category = find(id);
        category.setActive(request.isActive());
        return toResponse(category, List.of());
    }

    @Transactional
    public void delete(UUID id) {
        if (categories.existsByParentId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A category with child categories cannot be deleted.");
        }
        if (categories.existsProductAssignment(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A category with product assignments cannot be deleted.");
        }
        categories.delete(find(id));
    }

    private void apply(Category category, Upsert request) {
        Category parent = request.parentId() == null ? null : find(request.parentId());
        if (parent != null && parent.getId().equals(category.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A category cannot be its own parent.");
        }
        for (Category ancestor = parent; ancestor != null; ancestor = ancestor.getParent()) {
            if (ancestor.getId().equals(category.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A category cannot be moved below one of its descendants.");
            }
        }
        category.setName(request.name().trim());
        category.setSlug(request.slug().trim());
        category.setCategoryType(request.categoryType());
        category.setDescription(request.description() == null ? "" : request.description().trim());
        category.setImageUrl(blankToNull(request.imageUrl()));
        category.setDisplayOrder(request.displayOrder());
        category.setActive(request.isActive());
        category.setParent(parent);
    }

    private String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    private Category find(UUID id) {
        return categories.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found."));
    }

    private List<Response> asTree(List<Category> rows) {
        Map<UUID, List<Category>> children = new HashMap<>();
        List<Category> roots = new ArrayList<>();
        for (Category category : rows) {
            if (category.getParent() == null) roots.add(category);
            else children.computeIfAbsent(category.getParent().getId(), ignored -> new ArrayList<>()).add(category);
        }
        Comparator<Category> order = Comparator.comparingInt(Category::getDisplayOrder).thenComparing(Category::getName);
        roots.sort(order);
        children.values().forEach(list -> list.sort(order));
        return roots.stream().map(category -> toResponse(category, treeChildren(category, children))).toList();
    }

    private List<Response> treeChildren(Category category, Map<UUID, List<Category>> children) {
        return children.getOrDefault(category.getId(), List.of()).stream()
                .map(child -> toResponse(child, treeChildren(child, children))).toList();
    }

    private Response toResponse(Category category, List<Response> children) {
        return new Response(category.getId(), category.getName(), category.getSlug(),
                category.getParent() == null ? null : category.getParent().getId(), category.getCategoryType(),
                category.getDescription(), category.getImageUrl(), category.getDisplayOrder(), category.isActive(), children);
    }
}
