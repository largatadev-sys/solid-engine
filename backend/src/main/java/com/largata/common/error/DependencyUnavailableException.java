package com.largata.common.error;

/**
 * A required downstream dependency did not answer. Naming follows 06b §3's {@code
 * {Entity}{Condition}} convention.
 *
 * <p>The message is deliberately vague: naming the failed dependency would tell an anonymous
 * caller about our topology. The operator gets the detail from the correlated log line instead.
 */
public class DependencyUnavailableException extends UnavailableException {

    public DependencyUnavailableException(String message) {
        super("DEPENDENCY_UNAVAILABLE", message);
    }
}
