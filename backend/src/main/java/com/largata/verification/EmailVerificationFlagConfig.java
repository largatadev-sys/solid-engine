package com.largata.verification;

import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import java.io.IOException;
import java.io.InputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;


@Configuration
class EmailVerificationFlagConfig {

    private static final Logger log = LoggerFactory.getLogger(EmailVerificationFlagConfig.class);

    static final String CREDENTIALS_PRESENT = "!'${largata.firebase.credentials:}'.isBlank()";

    private static final String APP_NAME = "largata-verification";

    @Bean
    @ConditionalOnExpression(CREDENTIALS_PRESENT)
    EmailVerificationFlag firebaseEmailVerificationFlag(
            @Value("${largata.firebase.credentials}") String credentials) {
        try {
            return new FirebaseEmailVerificationFlag(FirebaseAuth.getInstance(app(credentials)));
        } catch (RuntimeException credentialIsPresentButUnusable) {
            log.error(
                    "largata.firebase.credentials is set but unusable, so email verification will "
                            + "refuse with 503. Expected inline service-account JSON, or a readable "
                            + "path to it. Everything else still starts.",
                    credentialIsPresentButUnusable);
            return new UnconfiguredEmailVerificationFlag();
        }
    }

    @Bean
    @ConditionalOnMissingBean(EmailVerificationFlag.class)
    EmailVerificationFlag unconfiguredEmailVerificationFlag() {
        return new UnconfiguredEmailVerificationFlag();
    }

    private static FirebaseApp app(String credentials) {
        return FirebaseApp.getApps().stream()
                .filter(existing -> APP_NAME.equals(existing.getName()))
                .findFirst()
                .orElseGet(() -> initialize(credentials));
    }

    private static FirebaseApp initialize(String credentials) {
        try (InputStream serviceAccount = FirebaseCredentials.open(credentials)) {
            return FirebaseApp.initializeApp(
                    FirebaseOptions.builder()
                            .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                            .setHttpTransport(new NetHttpTransport())
                            .build(),
                    APP_NAME);
        } catch (IOException unreadableCredential) {
            throw new IllegalStateException(
                    "largata.firebase.credentials is set but unreadable: expected inline service-account "
                            + "JSON, or a filesystem path to it",
                    unreadableCredential);
        }
    }
}
