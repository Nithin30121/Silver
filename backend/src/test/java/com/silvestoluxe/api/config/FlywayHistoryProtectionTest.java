package com.silvestoluxe.api.config;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class FlywayHistoryProtectionTest {

    @Test
    void locksDownTheHistoryTableWhenTheDataApiCanReachIt() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.queryForList(contains("flyway_schema_history"), eq(Boolean.class))).thenReturn(List.of(true));

        FlywayHistoryProtection.protect(jdbcTemplate);

        verify(jdbcTemplate).execute("alter table public.flyway_schema_history enable row level security");
        verify(jdbcTemplate).execute("revoke all on table public.flyway_schema_history from anon, authenticated");
    }

    @Test
    void leavesAnAlreadyProtectedHistoryTableAlone() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.queryForList(contains("flyway_schema_history"), eq(Boolean.class))).thenReturn(List.of(false));

        FlywayHistoryProtection.protect(jdbcTemplate);

        verify(jdbcTemplate, never()).execute(anyString());
    }
}
