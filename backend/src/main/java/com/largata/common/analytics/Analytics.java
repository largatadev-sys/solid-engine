package com.largata.common.analytics;

/**
 * The analytics seam (register #2, S0.3 grilling): the call sites are the asset; the sink is
 * plumbing.
 *
 * <p><strong>Why this interface exists before anyone reads the data.</strong> Nothing will read a
 * build-phase event — the only "users" until the E6 alpha are the developer and the dev environment.
 * What is being built now is the <em>call sites</em>: each story instruments its own meaningful
 * moment, while the person who knows where that moment is (the story's author) is writing it. The
 * expensive alternative is the archaeology sweep on alpha-eve, walking fifty stories asking "where
 * should events have been emitted?" and retrofitting them under a deadline.
 *
 * <p><strong>The sink is deliberately weak, and that is recorded.</strong> v1 writes a structured
 * log line ({@link LoggingAnalytics}) — no table, no third-party SDK, no data-sharing decision made
 * on the COO's behalf before their wishlist (register #2) exists. Log retention means these events
 * are disposable, which is correct while they are disposable. The epic map carries the trigger:
 * <strong>the sink goes durable before alpha</strong>, decided with registers #1/#2. That upgrade
 * replaces one class behind this interface.
 */
public interface Analytics {

    /**
     * Records that something product-meaningful happened.
     *
     * <p><strong>Never throws, never blocks meaningfully, never fails the caller.</strong>
     * Implementations must swallow their own failures: no user action may fail because telemetry
     * hiccuped. Callers therefore need no try/catch and no null checks — which is also what keeps
     * instrumentation from cluttering the logic it instruments.
     */
    void emit(AnalyticsEvent event);
}
