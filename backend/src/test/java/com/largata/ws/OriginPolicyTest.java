package com.largata.ws;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class OriginPolicyTest {

    private final OriginPolicy dev =
            OriginPolicy.allowing(List.of("http://localhost:8081", "http://10.0.2.2:8083"));
    private final OriginPolicy prod = OriginPolicy.browsersRefused();

    @Test
    void anAllowlistedOriginIsAdmitted() {
        assertThat(dev.admits("http://localhost:8081")).isTrue();
        assertThat(dev.admits("http://10.0.2.2:8083")).isTrue();
    }

    @Test
    void anOriginOutsideTheAllowlistIsRefused() {
        assertThat(dev.admits("https://evil.example")).isFalse();
    }

    @Test
    void hostAndHostPortAreDistinctEntriesJustAsGoogleTreatsThem() {
        assertThat(dev.admits("http://localhost")).isFalse();
    }

    @Test
    void anAbsentOriginIsAdmittedBecauseNativeClientsSendNone() {
        assertThat(dev.admits(null)).isTrue();
        assertThat(prod.admits(null)).isTrue();
    }

    @Test
    void prodRefusesEveryBrowserOriginBecauseNoAllowlistBeanExistsThere() {
        assertThat(prod.admits("http://localhost:8081")).isFalse();
        assertThat(prod.admits("https://founders.largata.com")).isFalse();
    }

    @Test
    void anEmptyOriginHeaderIsTreatedAsAbsentRatherThanAsAnOriginNamedEmptyString() {
        assertThat(prod.admits("")).isTrue();
    }
}
