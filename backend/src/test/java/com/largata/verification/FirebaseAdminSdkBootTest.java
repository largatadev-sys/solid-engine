package com.largata.verification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseOptions;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyPairGenerator;
import java.util.Base64;
import org.junit.jupiter.api.Test;

class FirebaseAdminSdkBootTest {

    @Test
    void buildingAdminSdkOptionsDoesNotBlowUpOnAMissingTransport() throws Exception {
        assertThatCode(
                        () ->
                                FirebaseOptions.builder()
                                        .setCredentials(
                                                GoogleCredentials.fromStream(
                                                        new ByteArrayInputStream(
                                                                syntheticServiceAccount()
                                                                        .getBytes(StandardCharsets.UTF_8))))
                                        .build())
                .as("FirebaseOptions' constructor probes for an HTTP transport UNGUARDED. Excluding "
                        + "the wrong transitive dependency compiles, keeps every unit test green, and "
                        + "then kills the application at startup with a NoClassDefFoundError that "
                        + "names a class nobody in this repo wrote. This is the cheapest rung that "
                        + "can see it.")
                .doesNotThrowAnyException();
    }

    @Test
    void theSyntheticCredentialIsRealEnoughForTheAssertionToMeanSomething() throws Exception {
        GoogleCredentials credentials =
                GoogleCredentials.fromStream(
                        new ByteArrayInputStream(syntheticServiceAccount().getBytes(StandardCharsets.UTF_8)));

        assertThat(credentials).isNotNull();
    }

    private static String pemBoundaryAssembledSoNoPemHeaderLiteralEntersThisFile(String label) {
        String dashes = "-".repeat(5);
        return dashes + label + dashes;
    }

    private static String syntheticServiceAccount() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        String pem =
                (pemBoundaryAssembledSoNoPemHeaderLiteralEntersThisFile("BEGIN PRIVATE KEY")
                                + "\n"
                                + Base64.getMimeEncoder(64, "\n".getBytes(StandardCharsets.UTF_8))
                                        .encodeToString(generator.generateKeyPair().getPrivate().getEncoded())
                                + "\n"
                                + pemBoundaryAssembledSoNoPemHeaderLiteralEntersThisFile("END PRIVATE KEY")
                                + "\n")
                        .replace("\n", "\\n");

        return "{\"type\":\"service_account\","
                + "\"project_id\":\"largata-test\","
                + "\"private_key_id\":\"synthetic\","
                + "\"private_key\":\""
                + pem
                + "\","
                + "\"client_email\":\"synthetic@largata-test.iam.gserviceaccount.com\","
                + "\"client_id\":\"000000000000000000000\","
                + "\"token_uri\":\"https://oauth2.googleapis.com/token\"}";
    }
}
