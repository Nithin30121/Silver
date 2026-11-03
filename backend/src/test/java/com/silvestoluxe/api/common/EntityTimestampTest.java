package com.silvestoluxe.api.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;

/**
 * Hibernate writes every mapped column on insert, so a required createdAt or updatedAt left unset is sent as
 * an empty value and the database refuses the new row. Categories could not be added because of exactly that.
 */
class EntityTimestampTest {

    @Test
    void everyRequiredTimestampIsFilledInBeforeSaving() throws ClassNotFoundException {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));
        List<String> unset = new ArrayList<>();
        int entities = 0;
        for (BeanDefinition definition : scanner.findCandidateComponents("com.silvestoluxe.api")) {
            entities++;
            for (Field field : Class.forName(definition.getBeanClassName()).getDeclaredFields()) {
                Column column = field.getAnnotation(Column.class);
                boolean written = column != null && !column.nullable() && column.insertable();
                if (written && field.getName().equals("createdAt") && !field.isAnnotationPresent(CreationTimestamp.class)
                        || written && field.getName().equals("updatedAt") && !field.isAnnotationPresent(UpdateTimestamp.class)) {
                    unset.add(field.getDeclaringClass().getSimpleName() + "." + field.getName());
                }
            }
        }

        assertFalse(entities == 0, "No entities were found to check.");
        assertEquals(List.of(), unset);
    }
}
