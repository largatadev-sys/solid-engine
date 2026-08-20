package com.largata.common.security;

import com.largata.common.logging.LogContextFilter;
import com.largata.common.logging.UserContextFilter;
import com.largata.ws.WebSocketPaths;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;


@Configuration
public class SecurityConfig {

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
                                        .requestMatchers(WebSocketPaths.UPGRADE)
                                        .permitAll()
                                        .requestMatchers(HttpMethod.GET, "/v1/health")
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
