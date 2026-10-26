package com.silvestoluxe.api.security;

import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.mockito.Mockito.mock;

class InitialAdministratorBootstrapTest {

    @Test
    void doesNothingWhenNoInitialAdministratorEmailIsConfigured() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);

        new InitialAdministratorBootstrap(jdbcTemplate, " ").run(new DefaultApplicationArguments());

        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void promotesConfiguredCustomerOnlyWhenNoAdministratorExists() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.queryForObject(contains("role = 'admin'"), eq(Integer.class))).thenReturn(0);
        when(jdbcTemplate.update(contains("set role = 'admin'"), eq("owner@example.com"))).thenReturn(1);

        new InitialAdministratorBootstrap(jdbcTemplate, " OWNER@example.com ")
                .run(new DefaultApplicationArguments());

        verify(jdbcTemplate).execute("select pg_advisory_xact_lock(821452197)");
        verify(jdbcTemplate).update(contains("set role = 'admin'"), eq("owner@example.com"));
    }

    @Test
    void neverPromotesAnotherAccountWhenAnAdministratorAlreadyExists() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        when(jdbcTemplate.queryForObject(contains("role = 'admin'"), eq(Integer.class))).thenReturn(1);

        new InitialAdministratorBootstrap(jdbcTemplate, "owner@example.com")
                .run(new DefaultApplicationArguments());

        verify(jdbcTemplate, never()).update(contains("set role = 'admin'"), eq("owner@example.com"));
    }
}
