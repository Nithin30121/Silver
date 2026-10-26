package com.silvestoluxe.api.security;

import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * A deliberately narrow, server-only first-admin setup mechanism.
 *
 * It can promote one configured, already-created account only while no administrator exists.
 * Browser requests never reach this code and customers cannot alter their own roles through RLS.
 */
@Component
public class InitialAdministratorBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(InitialAdministratorBootstrap.class);
    private static final int ADMIN_BOOTSTRAP_LOCK = 821_452_197;

    private final JdbcTemplate jdbcTemplate;
    private final String initialAdministratorEmail;

    public InitialAdministratorBootstrap(
            JdbcTemplate jdbcTemplate,
            @Value("${app.admin.initial-email:}") String initialAdministratorEmail) {
        this.jdbcTemplate = jdbcTemplate;
        this.initialAdministratorEmail = initialAdministratorEmail;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments arguments) {
        String email = initialAdministratorEmail.trim().toLowerCase(Locale.ROOT);
        if (email.isBlank()) {
            return;
        }

        // Serialises this one-time operation even if two API instances start at the same time.
        jdbcTemplate.execute("select pg_advisory_xact_lock(" + ADMIN_BOOTSTRAP_LOCK + ")");

        Integer administratorCount = jdbcTemplate.queryForObject(
                "select count(*) from public.profiles where role = 'admin'", Integer.class);
        if (administratorCount != null && administratorCount > 0) {
            log.info("Initial administrator bootstrap skipped because an administrator already exists.");
            return;
        }

        int promoted = jdbcTemplate.update("""
                update public.profiles
                set role = 'admin'
                where lower(email) = ? and role = 'customer'
                """, email);

        if (promoted == 1) {
            log.info("Initial administrator account configured successfully.");
        } else {
            log.warn("Initial administrator bootstrap did not find a matching customer profile.");
        }
    }
}
