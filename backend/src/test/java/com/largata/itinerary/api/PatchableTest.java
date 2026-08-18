package com.largata.itinerary.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

class PatchableTest {

    record Patch(String title, Patchable<String> description, Patchable<LocalDate> startDate) {}

    private final ObjectMapper json = new ObjectMapper();

    @Test
    void anAbsentKeyReadsAsAbsentAndKeepsTheCurrentValue() {
        Patch patch = json.readValue("{\"title\":\"Boracay Barkada Trip\"}", Patch.class);

        assertThat(Patchable.isAbsent(patch.description())).isTrue();
        assertThat(Patchable.applyTo(patch.description(), "One week of beach"))
                .isEqualTo("One week of beach");
    }

    @Test
    void anExplicitNullReadsAsClearedAndClearsTheCurrentValue() {
        Patch patch = json.readValue("{\"title\":\"Boracay Barkada Trip\",\"description\":null}", Patch.class);

        assertThat(Patchable.isAbsent(patch.description())).isFalse();
        assertThat(patch.description().clears()).isTrue();
        assertThat(Patchable.applyTo(patch.description(), "One week of beach")).isNull();
    }

    @Test
    void aValueReplacesTheCurrentValue() {
        Patch patch = json.readValue("{\"title\":\"t\",\"description\":\"Island hopping\"}", Patch.class);

        assertThat(patch.description().clears()).isFalse();
        assertThat(Patchable.applyTo(patch.description(), "One week of beach")).isEqualTo("Island hopping");
    }

    @Test
    void aPatchableCarriesItsDeclaredTypeRatherThanRawJson() {
        Patch patch = json.readValue("{\"title\":\"t\",\"startDate\":\"2027-03-12\"}", Patch.class);

        assertThat(patch.startDate().value()).isEqualTo(LocalDate.of(2027, 3, 12));
    }

    @Test
    void anAbsentDateIsNotAClearedDate() {
        Patch absent = json.readValue("{\"title\":\"t\"}", Patch.class);
        Patch cleared = json.readValue("{\"title\":\"t\",\"startDate\":null}", Patch.class);

        LocalDate current = LocalDate.of(2027, 3, 12);

        assertThat(Patchable.applyTo(absent.startDate(), current)).isEqualTo(current);
        assertThat(Patchable.applyTo(cleared.startDate(), current)).isNull();
    }
}
