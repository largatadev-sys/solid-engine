package com.largata.common.error;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
public class ThrowingTestController {

    static final String BASE = "/v1/test-errors";

    @TestConfiguration
    public static class Config {
        @Bean
        ThrowingTestController throwingTestController() {
            return new ThrowingTestController();
        }
    }

    @GetMapping(BASE + "/not-found")
    void notFound() {
        throw new TestNotFound();
    }

    @GetMapping(BASE + "/validation")
    void validation() {
        throw new TestInvalid();
    }

    @GetMapping(BASE + "/conflict")
    void conflict() {
        throw new TestConflict();
    }

    @GetMapping(BASE + "/forbidden")
    void forbidden() {
        throw new TestForbidden();
    }

    @GetMapping(BASE + "/unavailable")
    void unavailable() {
        throw new DependencyUnavailableException("The service is temporarily unavailable.");
    }


    @GetMapping(BASE + "/unexpected")
    void unexpected() {
        throw new IllegalStateException("boom: internal detail that must never reach the client");
    }

    static final class TestNotFound extends NotFoundException {
        TestNotFound() {
            super("TEST_NOT_FOUND", "The thing was not found.");
        }
    }

    static final class TestInvalid extends ValidationException {
        TestInvalid() {
            super("TEST_INVALID", "The request was invalid.");
        }
    }

    static final class TestConflict extends ConflictException {
        TestConflict() {
            super("TEST_CONFLICT", "That conflicts with the current state.");
        }
    }

    static final class TestForbidden extends ForbiddenException {
        TestForbidden() {
            super("TEST_FORBIDDEN", "You may not do that.");
        }
    }
}
