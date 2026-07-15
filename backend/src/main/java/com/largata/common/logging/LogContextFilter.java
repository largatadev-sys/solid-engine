package com.largata.common.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Injects request-scoped log context once, at the boundary (06b §4) — leaf code never sets these.
 *
 * <p>{@code userId} joins this filter at S0.2, when auth exists. It is set here and nowhere else,
 * by design: the AC that "userId appears in request-scoped logs via the filter, never set by leaf
 * code" (S0.2) depends on this being the only writer.
 *
 * <p>Named {@code LogContextFilter}, not {@code RequestContextFilter}: Spring's own {@code
 * WebMvcAutoConfiguration} already registers a bean named {@code requestContextFilter}, and the
 * duplicate bean name stops the context from starting (bean overriding is disabled by default).
 */
@Component
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
