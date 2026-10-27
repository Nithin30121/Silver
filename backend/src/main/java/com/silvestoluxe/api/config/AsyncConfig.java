package com.silvestoluxe.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/** Order emails are sent on Spring Boot's task executor, so a slow mail server never delays an API response. */
@Configuration
@EnableAsync
class AsyncConfig { }
