package com.largata.identity;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;


class ProfileFenceCoverageTest {

    private static final Path CONTROLLERS = Path.of("src/main/java/com/largata");

    private static final Path PROFILE_CONTROLLER =
            Path.of("src/main/java/com/largata/itinerary/web/PublicProfileController.java");


    private static final Set<String> DELIBERATELY_OPEN_TO_EVERY_TRAVELER =
            Set.of("profile", "published");


    private static final Set<String> KNOWN_FENCE_CONSUMERS =
            Set.of("PublicProfileController.java", "PostcardFeedController.java");


    private static final Set<String> KNOWN_PROFILE_SUB_RESOURCE_GETS =
            Set.of(
                    "PublicProfileController.java#profile",
                    "PublicProfileController.java#published",
                    "PublicProfileController.java#diaryTrips",
                    "PublicProfileController.java#followers",
                    "PublicProfileController.java#following");


    private static final Pattern HANDLE_ADDRESSED_GET =
            Pattern.compile(
                    "@GetMapping\\(?[^)]*\\)?\\s+(?:[\\w.<>,\\[\\]\\s]+?)\\s(\\w+)"
                            + "\\(((?:[^()]|\\([^()]*\\))*)\\)\\s*(?:throws[\\w.,\\s]+?)?\\{"
                            + "((?:[^{}]|\\{[^{}]*\\})*)",
                    Pattern.DOTALL);


    private static final Pattern AUTHORED_READ =
            Pattern.compile("requireReadable\\(|requireAudience\\(");


    @Test
    void everyHandleAddressedGetEitherFencesTheProfileOrIsNamedAsDeliberatelyOpen() throws IOException {
        List<String> unfenced = new ArrayList<>();

        for (ScannedHandler handler : profileHandlers()) {
            if (AUTHORED_READ.matcher(handler.body()).find()
                    || DELIBERATELY_OPEN_TO_EVERY_TRAVELER.contains(handler.name())) {
                continue;
            }
            unfenced.add(handler.qualifiedName());
        }

        assertThat(unfenced)
                .as(
                        "ADR-034: a private profile's AUTHORED content is readable only by the owner and "
                                + "their approved followers. A handle-addressed GET must consult "
                                + "AuthoredContentAudience or be named as deliberately open with a reason — "
                                + "the header, the counts and the published showcase are open by decision 2, "
                                + "and everything else on this surface is not. This is the S4.1 lesson applied "
                                + "to the second fence this codebase owns: that one shipped at two of its "
                                + "three doors and only a review caught the third, and S4.40 will add doors here")
                .isEmpty();
    }


    @Test
    void theScanReachesEveryProfileSubResourceItIsSupposedToGuard() throws IOException {
        List<String> scanned = profileHandlers().stream().map(ScannedHandler::qualifiedName).toList();

        assertThat(scanned)
                .as(
                        "an empty unfenced list proves nothing if the pattern matched nothing — the two "
                                + "outcomes are indistinguishable, which is the trap the workspace scan "
                                + "already sprang once. Any reformat, throws clause or annotation shape that "
                                + "drops a real handler out of the scan fails here instead of passing silently")
                .containsAll(KNOWN_PROFILE_SUB_RESOURCE_GETS);
    }


    @Test
    void exactlyTheNamedControllersConsultTheAuthoredContentFence() throws IOException {
        List<String> consulting = new ArrayList<>();

        for (Path source : controllerSources()) {
            String body = Files.readString(source);
            if (body.contains("AuthoredContentAudience")) {
                consulting.add(source.getFileName().toString());
            }
        }

        assertThat(consulting)
                .as(
                        "the read rule has ONE definition (ADR-002: identity owns the traveler and follow "
                                + "tables, and nothing outside it may answer this question). EXACTLY, in both "
                                + "directions: dropping the fence from a named controller fails here, and a new "
                                + "controller that starts consulting it fails until somebody adds it and says "
                                + "which surface it fences. What this canNOT see is a new authored-content door "
                                + "that never mentions the fence at all — no scan of this shape can, so the "
                                + "handler scan above is what guards the profile surface itself")
                .containsExactlyInAnyOrderElementsOf(KNOWN_FENCE_CONSUMERS);
    }


    private static List<ScannedHandler> profileHandlers() throws IOException {
        String source = Files.readString(PROFILE_CONTROLLER);
        String file = PROFILE_CONTROLLER.getFileName().toString();

        List<ScannedHandler> found = new ArrayList<>();
        Matcher handler = HANDLE_ADDRESSED_GET.matcher(source);
        while (handler.find()) {
            found.add(new ScannedHandler(file, handler.group(1), handler.group(3)));
        }
        return found;
    }


    private static List<Path> controllerSources() throws IOException {
        try (Stream<Path> tree = Files.walk(CONTROLLERS)) {
            return tree.filter(path -> path.getFileName().toString().endsWith("Controller.java")).toList();
        }
    }


    private record ScannedHandler(String file, String name, String body) {
        String qualifiedName() {
            return file + "#" + name;
        }
    }
}
