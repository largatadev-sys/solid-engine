package com.largata.support;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;


class SourceEncodingTest {

    private static final byte[] UTF8_BOM = {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};

    @Test
    void noSourceFileStartsWithAByteOrderMark() {
        List<Path> offenders = sourceFiles().filter(SourceEncodingTest::startsWithBom).toList();

        assertThat(offenders)
                .as(
                        "a UTF-8 BOM makes javac fail with \"illegal character: '\\ufeff'\" inside the "
                                + "container build while the host build stays green. PowerShell's "
                                + "Set-Content -Encoding utf8 writes one.")
                .isEmpty();
    }

    @Test
    void theScanReachesRealFiles() {
        assertThat(sourceFiles().count()).isGreaterThan(50);
    }

    @Test
    void theRuleWouldFireOnAFileThatHadOne() {
        assertThat(startsWithBytes(UTF8_BOM, "package com.largata;".getBytes())).isTrue();
        assertThat(startsWithBytes(new byte[0], "package com.largata;".getBytes())).isFalse();
    }

    private static Stream<Path> sourceFiles() {
        try {
            return Files.walk(Path.of("src"))
                    .filter(Files::isRegularFile)
                    .filter(path -> {
                        String name = path.getFileName().toString();
                        return name.endsWith(".java") || name.endsWith(".sql") || name.endsWith(".yml");
                    });
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static boolean startsWithBom(Path path) {
        try {
            byte[] head = new byte[3];
            try (var in = Files.newInputStream(path)) {
                if (in.read(head) < 3) {
                    return false;
                }
            }
            return head[0] == UTF8_BOM[0] && head[1] == UTF8_BOM[1] && head[2] == UTF8_BOM[2];
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static boolean startsWithBytes(byte[] prefix, byte[] rest) {
        byte[] combined = new byte[prefix.length + rest.length];
        System.arraycopy(prefix, 0, combined, 0, prefix.length);
        System.arraycopy(rest, 0, combined, prefix.length, rest.length);
        return combined.length >= 3
                && combined[0] == UTF8_BOM[0]
                && combined[1] == UTF8_BOM[1]
                && combined[2] == UTF8_BOM[2];
    }
}
