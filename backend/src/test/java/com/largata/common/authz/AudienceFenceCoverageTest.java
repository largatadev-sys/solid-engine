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


    private static final Pattern HANDLER =
            Pattern.compile(
                    "@GetMapping\\(?[^)]*\\)?\\s+(?:[\\w.<>,\\[\\]\\s]+?)\\s(\\w+)"
                            + "\\(((?:[^()]|\\([^()]*\\))*)\\)\\s*\\{"
                            + "((?:[^{}]|\\{[^{}]*\\})*)",
                    Pattern.DOTALL);


    @Test
    void everyWorkspaceScopedGetEitherFencesTheAudienceOrIsNamedAsAnException() throws IOException {
        List<String> unfenced = new ArrayList<>();

        for (Path controller : controllerSources()) {
            String source = Files.readString(controller);
            if (!source.contains("guard.requireMember")) {
                continue;
            }
            Matcher handler = HANDLER.matcher(source);
            while (handler.find()) {
                String name = handler.group(1);
                String body = handler.group(3);
                if (!body.contains("guard.requireMember")) {
                    continue;
                }
                if (body.contains("requireInAudience") || OWNER_ONLY_OR_DELIBERATELY_UNFENCED.contains(name)) {
                    continue;
                }
                unfenced.add(controller.getFileName() + "#" + name);
            }
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
    void theScanSeesAHandlerWhoseParametersCarryTheirOwnParentheses() {
        String source =
                """
                @GetMapping
                Page<DiaryEntryResponse> mine(
                        @CurrentTraveler Traveler traveler,
                        @PathVariable UUID itineraryId,
                        @RequestParam(required = false) String cursor) {
                    Membership member = guard.requireMember(traveler.id(), itineraryId);
                    return diary.mine(member, cursor);
                }
                """;

        Matcher handler = HANDLER.matcher(source);

        assertThat(handler.find())
                .as(
                        "a parameter list carrying its own parentheses once ended the match early, so the "
                                + "handler was never scanned and its missing fence never reported — an "
                                + "unfenced door the coverage test could not see")
                .isTrue();
        assertThat(handler.group(1)).isEqualTo("mine");
        assertThat(handler.group(3)).contains("guard.requireMember");
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
