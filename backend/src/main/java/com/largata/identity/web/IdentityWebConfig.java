package com.largata.identity.web;

import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Registers {@link CurrentTravelerArgumentResolver} — without this, {@code @CurrentTraveler} is inert. */
@Configuration
class IdentityWebConfig implements WebMvcConfigurer {

    private final CurrentTravelerArgumentResolver currentTraveler;

    IdentityWebConfig(CurrentTravelerArgumentResolver currentTraveler) {
        this.currentTraveler = currentTraveler;
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(currentTraveler);
    }
}
