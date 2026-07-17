package com.largata.health.api;

/**
 * DTO in the module's own {@code api} package (06b §6). Success responses carry no envelope —
 * Artifact 05 defines one for errors only.
 */
public record HealthResponse(String status) {}
