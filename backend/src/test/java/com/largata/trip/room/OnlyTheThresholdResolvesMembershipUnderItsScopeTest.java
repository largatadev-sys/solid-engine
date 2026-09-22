package com.largata.trip.room;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.RoutesUnderTheThreshold;
import com.largata.support.RoutesUnderTheThreshold.Handler;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;


class OnlyTheThresholdResolvesMembershipUnderItsScopeTest {

    private static final List<String> THE_ROOMS_OWN_WORK = List.of("guard.", "fence.", "requireMember(");


    @Test
    void noControllerUnderTheThresholdResolvesAMembershipOrConsultsTheFenceItself() {
        Set<Path> controllers =
                RoutesUnderTheThreshold.underTheScope().stream().map(Handler::source).collect(Collectors.toSet());

        List<String> offenders =
                controllers.stream()
                        .filter(source -> THE_ROOMS_OWN_WORK.stream().anyMatch(read(source)::contains))
                        .map(Path::toString)
                        .sorted()
                        .toList();

        assertThat(offenders)
                .as(
                        "the threshold resolves the membership and applies the fence once for every route"
                                + " that names a trip by id; a controller under it that does either again has"
                                + " re-grown the line-per-act shape TW-2 exists to remove, and is one deleted"
                                + " line from guarding nothing")
                .isEmpty();
        assertThat(controllers)
                .as("the scan must see the controllers it guards")
                .hasSizeGreaterThanOrEqualTo(12);
    }


    private static String read(Path source) {
        try {
            return Files.readString(source);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
