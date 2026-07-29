package com.largata.common.error;


public class DependencyUnavailableException extends UnavailableException {

    public DependencyUnavailableException(String message) {
        super("DEPENDENCY_UNAVAILABLE", message);
    }

    public DependencyUnavailableException(String message, Throwable cause) {
        super("DEPENDENCY_UNAVAILABLE", message, cause);
    }
}
