package com.largata.common.error;

/**
 * A required downstream dependency did not answer. Naming follows 06b §3's {@code
 * {Entity}{Condition}} convention.
 *
 * <p>The message is deliberately vague: naming the failed dependency would tell an anonymous
 * caller about our topology. The operator gets the detail from the correlated log line instead.
 *
 * <p>The cause travels on the exception rather than being logged where it is caught — P2 forbids
 * catch-log-and-rethrow, so only the global handler logs it, once.
 */
public class DependencyUnavailableException extends UnavailableException {

    public DependencyUnavailableException(String message) {
        super("DEPENDENCY_UNAVAILABLE", message);
    }

    public DependencyUnavailableException(String message, Throwable cause) {
        super("DEPENDENCY_UNAVAILABLE", message, cause);
    }
}
