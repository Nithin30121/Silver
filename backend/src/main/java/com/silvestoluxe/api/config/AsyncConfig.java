package com.silvestoluxe.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Order emails are sent on Spring Boot's task executor, so a slow mail server never delays an API
 * response. Scheduling runs the check for unpaid online orders.
 */
@Configuration
@EnableAsync
@EnableScheduling
class AsyncConfig { }
