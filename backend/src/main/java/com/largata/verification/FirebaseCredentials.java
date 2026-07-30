package com.largata.verification;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;


final class FirebaseCredentials {

    private FirebaseCredentials() {}


    static InputStream open(String configured) throws IOException {
        String value = configured.strip();
        return isInlineJson(value)
                ? new ByteArrayInputStream(value.getBytes(StandardCharsets.UTF_8))
                : Files.newInputStream(Path.of(value));
    }


    static boolean isInlineJson(String configured) {
        return configured.strip().startsWith("{");
    }
}
