package com.largata.identity.web;

import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Registers the identity module's argument resolvers — without this, {@code @CurrentTraveler} and
 * {@code @AuthEmail} are inert.
 */
@Configuration
class IdentityWebConfig implements WebMvcConfigurer {

    private final CurrentTravelerArgumentResolver currentTraveler;
    private final AuthEmailArgumentResolver authEmail;

    IdentityWebConfig(CurrentTravelerArgumentResolver currentTraveler, AuthEmailArgumentResolver authEmail) {
        this.currentTraveler = currentTraveler;
        this.authEmail = authEmail;
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(currentTraveler);
        resolvers.add(authEmail);
    }
}
