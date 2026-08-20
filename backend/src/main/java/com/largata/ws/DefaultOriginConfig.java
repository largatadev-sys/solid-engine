package com.largata.ws;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;


@Configuration
@Profile("!dev")
public class DefaultOriginConfig {

    @Bean
    OriginPolicy originPolicy() {
        return OriginPolicy.browsersRefused();
    }
}
