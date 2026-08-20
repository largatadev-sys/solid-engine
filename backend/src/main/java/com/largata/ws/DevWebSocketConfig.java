package com.largata.ws;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;


@Configuration
@Profile("dev")
public class DevWebSocketConfig {

    @Bean
    OriginPolicy devOriginPolicy(
            @Value(
                            "${largata.cors.allowed-origins:http://localhost:8081,http://localhost:8082,http://localhost:3000,http://127.0.0.1:8081,http://127.0.0.1:8082,http://127.0.0.1:3000}")
                    List<String> allowedOrigins) {
        return OriginPolicy.allowing(allowedOrigins);
    }

    @Bean
    DebugEchoTopic debugEchoTopic(EventFanout fanout) {
        return new DebugEchoTopic(fanout);
    }
}
