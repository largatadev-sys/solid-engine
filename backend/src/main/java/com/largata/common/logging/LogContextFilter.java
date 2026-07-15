package com.largata.common.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Injects request-scoped log context once, at the boundary (06b §4) — leaf code never sets these.
 *
 * <p><strong>Ordered ahead of Spring Security's chain, deliberately.</strong> Security registers at
 * order -100; an unordered {@code @Component} filter defaults to LOWEST_PRECEDENCE and therefore
 * runs <em>behind</em> it. A rejected request dies inside that chain, so this filter would never
 * run for a 401 and {@link com.largata.common.security.EnvelopeAuthenticationEntryPoint} would
 * render {@code traceId: null} — an error the client cannot correlate to any log line, and the
 * failure is invisible on the happy path (a 200 still gets its traceId, because the controller runs
 * after this filter either way). {@code UnauthenticatedContractIT} asserts the traceId in a real
 * 401 body precisely to keep this ordering honest; the default was wrong, and only that test said
 * so.
 *
 * <p>{@code userId} is <em>not</em> set here: it cannot be known before the security chain has
 * verified a token, and this filter runs in front of it. It is set by {@link UserContextFilter},
 * which the security config places inside the chain — one concern, two filters, because the two
 * facts become available at different moments.
 *
 * <p>Named {@code LogContextFilter}, not {@code RequestContextFilter}: Spring's own {@code
 * WebMvcAutoConfiguration} already registers a bean named {@code requestContextFilter}, and the
 * duplicate bean name stops the context from starting (bean overriding is disabled by default).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class LogContextFilter extends OncePerRequestFilter {

    public static final String TRACE_ID = "traceId";
    public static final String ENDPOINT = "endpoint";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        try {
            MDC.put(TRACE_ID, UUID.randomUUID().toString());
            MDC.put(ENDPOINT, request.getMethod() + " " + request.getRequestURI());
            chain.doFilter(request, response);
        } finally {
            // Threads are pooled: leaking MDC would attribute one request's context to the next.
            MDC.clear();
        }
    }
}
