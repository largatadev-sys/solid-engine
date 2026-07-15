package com.largata.common.error;

import java.time.Instant;

/**
 * The one error envelope (Artifact 05). Never carries stack traces, SQL, or internal exception
 * class names (P2).
 *
 * @param code stable machine string — the mobile client branches on this, never on {@code message}
 * @param message human-readable, safe to show
 * @param traceId correlates to the single server log line for this failure (P3)
 * @param timestamp when the failure was rendered
 */
public record ErrorResponse(String code, String message, String traceId, Instant timestamp) {}
