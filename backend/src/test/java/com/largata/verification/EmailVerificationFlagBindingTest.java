package com.largata.verification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.largata.common.error.DependencyUnavailableException;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class EmailVerificationFlagBindingTest {

    private final ApplicationContextRunner contexts =
            new ApplicationContextRunner().withUserConfiguration(EmailVerificationFlagConfig.class);

    @Test
    void noCredentialBindsTheUnconfiguredFlag() {
        contexts.run(context -> assertThat(context.getBean(EmailVerificationFlag.class))
                .isInstanceOf(UnconfiguredEmailVerificationFlag.class));
    }

    @Test
    void aBlankCredentialBindsTheUnconfiguredFlagRatherThanAHalfInitialisedAdminSdk() {
        contexts.withPropertyValues("largata.firebase.credentials=")
                .run(context -> assertThat(context.getBean(EmailVerificationFlag.class))
                        .isInstanceOf(UnconfiguredEmailVerificationFlag.class));
    }

    @Test
    void theUnconfiguredFlagRefusesLoudlyRatherThanReportingSuccessItCannotDeliver() {
        assertThatThrownBy(() -> new UnconfiguredEmailVerificationFlag().markVerified("uid-1"))
                .isInstanceOf(DependencyUnavailableException.class);
    }

    @Test
    void inlineJsonAndAPathAreToldApartByTheirFirstCharacter() {
        assertThat(FirebaseCredentials.isInlineJson("{\"type\":\"service_account\"}")).isTrue();
        assertThat(FirebaseCredentials.isInlineJson("  {\"type\":\"service_account\"}  ")).isTrue();
        assertThat(FirebaseCredentials.isInlineJson("/run/secrets/firebase-admin.json")).isFalse();
        assertThat(FirebaseCredentials.isInlineJson("C:\\keys\\firebase-admin.json")).isFalse();
    }
}
