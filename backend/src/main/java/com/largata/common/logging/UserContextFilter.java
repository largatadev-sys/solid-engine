package com.largata.common.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.MDC;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Adds {@code userId} to the log context, once, at the boundary (06b §4).
 *
 * <p><strong>Why this is a second filter and not two lines in {@link LogContextFilter}.</strong>
 * The two run at opposite ends of the security chain by necessity. {@code traceId} must exist
 * <em>before</em> security so a rejected request still correlates to a log line — its filter runs
 * first, when no principal exists yet. {@code userId} can only be known <em>after</em> the chain has
 * verified a token, so it is set here, behind it. One concern, two filters, because the fact
 * becomes available at a different moment.
 *
 * <p><strong>Only the verified principal, never the raw claim.</strong> The value comes from the
 * {@link Jwt} Spring Security put in the context after checking its signature, expiry and issuer.
 * Reading the {@code sub} claim off an unverified token would put an attacker-supplied string into
 * every log line as identity.
 *
 * <p>Nothing else ever calls {@code MDC.put("userId", …)} — the AC ("userId appears in
 * request-scoped logs via the filter, never set by leaf code") is a structural claim, and it holds
 * only while this is the sole writer. {@link LogContextFilter} clears the whole MDC at the end of
 * the request, which covers what this filter added.
 *
 * <p><strong>Not a {@code @Component}.</strong> Boot registers component filters with the servlet
 * container, ahead of the security chain — exactly where the security context is still empty and
 * this filter would silently do nothing on every request. {@code SecurityConfig} places it inside
 * the chain, after the authentication filter, which is the only position where it works.
 */
public class UserContextFilter extends OncePerRequestFilter {

    public static final String USER_ID = "userId";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            // The Firebase UID (06b §4 names userId as exactly this). Not the email: that is PII,
            // and it changes; the UID is the stable, non-identifying key.
            MDC.put(USER_ID, jwt.getSubject());
        }
        chain.doFilter(request, response);
    }
}
