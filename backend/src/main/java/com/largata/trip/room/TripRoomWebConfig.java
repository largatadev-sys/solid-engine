package com.largata.trip.room;

import com.largata.identity.web.CurrentTravelers;
import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;


@Configuration
class TripRoomWebConfig implements WebMvcConfigurer {

    static final String[] THE_SCOPE = {"/v1/trips/{itineraryId}", "/v1/trips/{itineraryId}/**"};

    private final WorkspaceThreshold threshold;

    TripRoomWebConfig(CurrentTravelers travelers, AuthorizationGuard guard, TripFence fence) {
        this.threshold =
                new WorkspaceThreshold(
                        travelers, guard, fence, UndeclaredWrites.ALLOWED_WHILE_THE_PROOFS_STILL_GUARD);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(threshold).addPathPatterns(THE_SCOPE);
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new CurrentMemberArgumentResolver());
    }
}
