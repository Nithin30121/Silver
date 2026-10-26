package com.silvestoluxe.api.config;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Keeps Flyway's migration history out of reach of the Supabase Data API.
 *
 * Flyway records applied migrations in public.flyway_schema_history, and Supabase gives new tables
 * in the public schema default grants: anyone holding the publishable key could read, change, or
 * delete migration history (for example, to make a future migration look already applied).
 *
 * This cannot be a Flyway migration: Flyway holds the history table while it migrates, so a
 * migration that alters that table waits on Flyway itself until the statement times out. It runs
 * once Flyway has finished instead. The backend is unaffected: it owns the table, and table owners
 * bypass row level security.
 */
@Configuration
class FlywayHistoryProtection {

    private static final Logger log = LoggerFactory.getLogger(FlywayHistoryProtection.class);

    @Bean
    FlywayMigrationStrategy migrateThenProtectHistory() {
        return flyway -> {
            flyway.migrate();
            protect(new JdbcTemplate(flyway.getConfiguration().getDataSource()));
        };
    }

    static void protect(JdbcTemplate jdbcTemplate) {
        List<Boolean> exposed = jdbcTemplate.queryForList("""
                select not c.relrowsecurity
                    or has_table_privilege('anon', c.oid, 'select, insert, update, delete, truncate')
                    or has_table_privilege('authenticated', c.oid, 'select, insert, update, delete, truncate')
                from pg_class c
                where c.oid = to_regclass('public.flyway_schema_history')
                """, Boolean.class);
        if (!exposed.contains(Boolean.TRUE)) {
            return;
        }

        jdbcTemplate.execute("alter table public.flyway_schema_history enable row level security");
        jdbcTemplate.execute("revoke all on table public.flyway_schema_history from anon, authenticated");
        log.info("Removed Data API access to Flyway's migration history.");
    }
}
