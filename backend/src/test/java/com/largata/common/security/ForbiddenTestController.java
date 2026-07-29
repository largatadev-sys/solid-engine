package com.largata.common.security;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
public class ForbiddenTestController {

    static final String PATH = "/v1/test-forbidden";

    @TestConfiguration
    @EnableMethodSecurity
    public static class Config {
        @Bean
        ForbiddenTestController forbiddenTestController() {
            return new ForbiddenTestController();
        }
    }

    @GetMapping(PATH)
    @PreAuthorize("hasAuthority('NOBODY_HAS_THIS')")
    void forbidden() {
    }
}
