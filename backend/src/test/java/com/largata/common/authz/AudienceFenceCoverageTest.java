package com.largata.common.authz;

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


class AudienceFenceCoverageTest {

    private static final Path CONTROLLERS = Path.of("src/main/java/com/largata");


    private static final Set<String> OWNER_ONLY_OR_DELIBERATELY_UNFENCED =
            Set.of("preview", "listMine");


    private static final Set<String> KNOWN_WORKSPACE_SCOPED_GETS =
            Set.of(
                    "ItineraryController.java#view",
                    "DiaryController.java#mine",
                    "DiaryController.java#one",
                    "PhotoDumpController.java#list",
                    "PollController.java#board",
                    "ChatController.java#thread");


    private static final Set<String> KNOWN_OPTIONAL_MEMBERSHIP_HANDLERS =
            Set.of(
                    "PublishedItineraryController.java#view",
                    "ItineraryController.java#fork");


    private static final Pattern ANY_HANDLER =
            Pattern.compile(
                    "@(?:Get|Post)Mapping\\(?[^)]*\\)?\\s+(?:@ResponseStatus\\([^)]*\\)\\s+)?"
                            + "(?:[\\w.<>,\\[\\]\\s]+?)\\s(\\w+)"
                            + "\\(((?:[^()]|\\([^()]*\\))*)\\)\\s*(?:throws[\\w.,\\s]+?)?\\{"
                            + "((?:[^{}]|\\{[^{}]*\\})*)",
                    Pattern.DOTALL);


    private static final Pattern HANDLER =
            Pattern.compile(
                    "@GetMapping\\(?[^)]*\\)?\\s+(?:[\\w.<>,\\[\\]\\s]+?)\\s(\\w+)"
                            + "\\(((?:[^()]|\\([^()]*\\))*)\\)\\s*(?:throws[\\w.,\\s]+?)?\\{"
                            + "((?:[^{}]|\\{[^{}]*\\})*)",
                    Pattern.DOTALL);


    @Test
    void everyWorkspaceScopedGetEitherFencesTheAudienceOrIsNamedAsAnException() throws IOException {
        List<String> unfenced = new ArrayList<>();

        for (ScannedHandler handler : scannedHandlers()) {
            if (handler.body().contains("requireInAudience")
                    || OWNER_ONLY_OR_DELIBERATELY_UNFENCED.contains(handler.name())) {
                continue;
            }
            unfenced.add(handler.qualifiedName());
        }

        assertThat(unfenced)
                .as(
                        "ADR-017: archived trips are owner-only sight. A workspace-scoped GET that resolves a "
                                + "membership must call AudienceFence.requireInAudience or be named in the "
                                + "exception set with a reason — S4.1 shipped this fence at two of its three "
                                + "doors, and only a review caught the third")
                .isEmpty();
    }


    @Test
    void theScanReachesEveryWorkspaceScopedGetItIsSupposedToGuard() throws IOException {
        List<String> scanned = scannedHandlers().stream().map(ScannedHandler::qualifiedName).toList();

        assertThat(scanned)
                .as(
                        "an empty unfenced list proves nothing if the pattern matched nothing — the two "
                                + "outcomes are indistinguishable. A parameter list carrying its own "
                                + "parentheses once ended the match early, so DiaryController#mine was never "
                                + "scanned, its missing fence never reported, and the coverage test stayed "
                                + "green. Any reformat, throws clause or annotation shape that drops a real "
                                + "handler out of the scan fails here instead of passing silently")
                .containsAll(KNOWN_WORKSPACE_SCOPED_GETS);
    }


    @Test
    void everyHandlerThatServesNonMembersIsNamedHereAndHandsTheOptionalOnward() throws IOException {
        List<ScannedHandler> serving = optionalMembershipHandlers();

        assertThat(serving.stream().map(ScannedHandler::qualifiedName).toList())
                .as(
                        "guard.membershipOf resolves an OPTIONAL membership, which is how a door opens to "
                                + "travelers who are not members — the published view and S4.7's fork. Such a "
                                + "handler is fenced by the published audience (PublishedVisibility), never by "
                                + "AudienceFence, so the scan above cannot see it. A NEW one fails here until "
                                + "somebody names it and states which fence it passes; that is the whole guard, "
                                + "because an unfenced fork-shaped POST would hand a stranger someone's plan")
                .containsExactlyInAnyOrderElementsOf(KNOWN_OPTIONAL_MEMBERSHIP_HANDLERS);

        for (ScannedHandler handler : serving) {
            assertThat(handler.body())
                    .as(
                            "the resolved Optional must reach the service that fences on it, never be "
                                    + "dropped: " + handler.qualifiedName())
                    .containsPattern("\\w+\\([^;]*guard\\.membershipOf\\(");
        }
    }


    @Test
    void theOptionalMembershipScanReachesTheHandlersItIsSupposedToGuard() throws IOException {
        assertThat(optionalMembershipHandlers()).as(
                        "the same anti-vacuity guard the GET scan carries: an empty list and a broken "
                                + "regex are indistinguishable, and this pattern has to match a POST "
                                + "carrying @ResponseStatus between the mapping and the return type")
                .isNotEmpty();
    }


    @Test
    void theExceptionSetNamesOnlyHandlersThatStillExist() throws IOException {
        String allControllers = controllerSourcesJoined();

        for (String exempt : OWNER_ONLY_OR_DELIBERATELY_UNFENCED) {
            assertThat(allControllers)
                    .as("a stale exception silently widens the fence's blind spot: " + exempt)
                    .contains(" " + exempt + "(");
        }
    }


    private record ScannedHandler(String file, String name, String body) {

        String qualifiedName() {
            return file + "#" + name;
        }
    }


    private static List<ScannedHandler> scannedHandlers() throws IOException {
        List<ScannedHandler> scanned = new ArrayList<>();

        for (Path controller : controllerSources()) {
            String source = Files.readString(controller);
            if (!source.contains("guard.requireMember")) {
                continue;
            }
            Matcher handler = HANDLER.matcher(source);
            while (handler.find()) {
                String body = handler.group(3);
                if (!body.contains("guard.requireMember")) {
                    continue;
                }
                scanned.add(
                        new ScannedHandler(
                                controller.getFileName().toString(), handler.group(1), body));
            }
        }
        return scanned;
    }


    private static List<ScannedHandler> optionalMembershipHandlers() throws IOException {
        List<ScannedHandler> scanned = new ArrayList<>();

        for (Path controller : controllerSources()) {
            String source = Files.readString(controller);
            if (!source.contains("guard.membershipOf")) {
                continue;
            }
            Matcher handler = ANY_HANDLER.matcher(source);
            while (handler.find()) {
                String body = handler.group(3);
                if (!body.contains("guard.membershipOf")) {
                    continue;
                }
                scanned.add(
                        new ScannedHandler(controller.getFileName().toString(), handler.group(1), body));
            }
        }
        return scanned;
    }


    private static List<Path> controllerSources() throws IOException {
        try (Stream<Path> tree = Files.walk(CONTROLLERS)) {
            return tree.filter(path -> path.getFileName().toString().endsWith("Controller.java")).toList();
        }
    }

    private static String controllerSourcesJoined() throws IOException {
        StringBuilder joined = new StringBuilder();
        for (Path controller : controllerSources()) {
            joined.append(Files.readString(controller));
        }
        return joined.toString();
    }
}
