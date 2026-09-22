package com.largata.trip.room;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.Sources;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;


class TheFenceOutliersAreNamedTest {

    private static final Path MAIN = Path.of("src/main/java/com/largata");

    private static final List<String> THE_OUTLIERS =
            List.of(
                    "postcard/legacy/web/DiaryController.java",
                    "invitation/service/InvitationService.java",
                    "join/join/service/JoinService.java",
                    "trip/ownership/service/MembershipService.java");


    @Test
    void everyCallToTheFenceOutsideTheRoomIsAnOutlierNamedHere() throws IOException {
        List<String> callers;
        try (Stream<Path> files = Files.walk(MAIN)) {
            callers =
                    files.filter(file -> file.toString().endsWith(".java"))
                            .filter(file -> !file.startsWith(MAIN.resolve("trip").resolve("room")))
                            .filter(file -> Sources.read(file).contains("fence.require"))
                            .map(file -> MAIN.relativize(file).toString().replace('\\', '/'))
                            .sorted()
                            .toList();
        }

        assertThat(callers)
                .as(
                        "the threshold applies the fence for every route that names a trip; an act it cannot"
                                + " reach — keyed by invitation id or token, the legacy diary route, the"
                                + " conditional removal branch of depart — asks the fence itself, and each such"
                                + " act is named here so a new one is a deliberate line in this list rather"
                                + " than a silent one in a service")
                .containsExactlyInAnyOrderElementsOf(THE_OUTLIERS);
    }
}
