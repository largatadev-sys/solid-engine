package com.largata.common.security;

import com.largata.common.logging.UserContextFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;


@Configuration
public class SecurityConfig {

    static final String WEBSOCKET_UPGRADE = "/ws";

    static final String LIVENESS = "/v1/health";

    static final String OPENING_A_JOIN_LINK = "/v1/join/**";

    static final String SUBMITTING_A_REPORT = "/v1/reports";

    @Bean
    SecurityFilterChain filterChain(
            HttpSecurity http,
            EnvelopeAuthenticationEntryPoint entryPoint,
            EnvelopeAccessDeniedHandler accessDeniedHandler)
            throws Exception {
        return http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                .authorizeHttpRequests(
                        auth ->
                                auth
                                        .requestMatchers(WEBSOCKET_UPGRADE)
                                        .permitAll()
                                        .requestMatchers(HttpMethod.GET, LIVENESS)
                                        .permitAll()
                                        .requestMatchers(OPENING_A_JOIN_LINK)
                                        .permitAll()
                                        .requestMatchers(HttpMethod.POST, SUBMITTING_A_REPORT)
                                        .permitAll()
                                        .anyRequest()
                                        .authenticated())
                .oauth2ResourceServer(
                        oauth2 -> oauth2.authenticationEntryPoint(entryPoint).jwt(Customizer.withDefaults()))
                .addFilterAfter(new UserContextFilter(), BearerTokenAuthenticationFilter.class)
                .exceptionHandling(
                        e -> e.authenticationEntryPoint(entryPoint).accessDeniedHandler(accessDeniedHandler))
                .build();
    }
}
