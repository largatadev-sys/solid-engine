package com.largata.trip;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class TripGrammarTwinIT extends PostgresTestBase {

    private static final String OLD_ROOT = "/v1/itineraries";

    private static final String NEW_ROOT = "/v1/trips";

    private static final Set<String> WITHOUT_A_TWIN =
            Set.of(
                    "POST /v1/itineraries/{id}/fork",
                    "POST /v1/itineraries/{id}/finish-planning",
                    "POST /v1/itineraries/{id}/publish",
                    "POST /v1/itineraries/{id}/unpublish",
                    "POST /v1/itineraries/{id}/audience",
                    "POST /v1/itineraries/{itineraryId}/diary/entries",
                    "GET /v1/itineraries/{itineraryId}/diary/entries",
                    "GET /v1/itineraries/{itineraryId}/diary/entries/{entryId}",
                    "PATCH /v1/itineraries/{itineraryId}/diary/entries/{entryId}",
                    "DELETE /v1/itineraries/{itineraryId}/diary/entries/{entryId}",
                    "POST /v1/itineraries/{itineraryId}/diary/entries/{entryId}/photos",
                    "POST /v1/itineraries/{itineraryId}/diary/entries/{entryId}/photos/from-dump",
                    "DELETE /v1/itineraries/{itineraryId}/diary/entries/{entryId}/photos/{photoId}");

    @Autowired private RequestMappingHandlerMapping handlers;

    @Test
    void everyOldGrammarRouteAnswersAtTheTripsRootThroughTheSameHandler() {
        Map<String, HandlerMethod> oldRoutes = routesUnder(OLD_ROOT);
        Map<String, Set<HandlerMethod>> newShapes = shapesUnder(NEW_ROOT);

        List<String> missing =
                oldRoutes.keySet().stream()
                        .filter(route -> !WITHOUT_A_TWIN.contains(route))
                        .filter(route -> !newShapes.containsKey(shapeOf(twinOf(route))))
                        .sorted()
                        .toList();

        assertThat(missing)
                .as(
                        "these old-grammar mappings have no %s twin; a workspace route declared under"
                                + " one root only is the drift this test exists to catch",
                        NEW_ROOT)
                .isEmpty();

        List<String> servedElsewhere =
                oldRoutes.entrySet().stream()
                        .filter(entry -> !WITHOUT_A_TWIN.contains(entry.getKey()))
                        .filter(entry -> newShapes.containsKey(shapeOf(twinOf(entry.getKey()))))
                        .filter(
                                entry ->
                                        !servedOnlyBy(
                                                newShapes.get(shapeOf(twinOf(entry.getKey()))),
                                                entry.getValue()))
                        .map(
                                entry ->
                                        entry.getKey()
                                                + " -> "
                                                + describe(entry.getValue())
                                                + " but "
                                                + twinOf(entry.getKey())
                                                + " -> "
                                                + describeAll(newShapes.get(shapeOf(twinOf(entry.getKey())))))
                        .sorted()
                        .toList();

        assertThat(servedElsewhere)
                .as("a twin served by a different Java method can drift; the pair must be one handler")
                .isEmpty();
    }


    @Test
    void thePathVariableIsSpeltTheSameOnBothPatternsOfEveryPair() {
        Set<String> newRoutes = routesUnder(NEW_ROOT).keySet();

        List<String> respelt =
                routesUnder(OLD_ROOT).keySet().stream()
                        .filter(route -> !WITHOUT_A_TWIN.contains(route))
                        .filter(route -> !newRoutes.contains(twinOf(route)))
                        .sorted()
                        .toList();

        assertThat(respelt)
                .as(
                        "a twin whose path variable is spelt differently is a second handler wearing"
                                + " the right shape - the pair must be one mapping, variables included")
                .isEmpty();
    }


    @Test
    void theTripsRootNeverGrewADeleteOnTheOldGrammar() {
        assertThat(routesUnder(OLD_ROOT))
                .as(
                        "S4.38 left DELETE /v1/itineraries/{id} unminted on purpose - destruction"
                                + " answers at the trip's own address only")
                .doesNotContainKey("DELETE /v1/itineraries/{id}");
    }


    @Test
    void theScanSawTheWholeOldGrammar() {
        assertThat(routesUnder(OLD_ROOT))
                .as("an empty or partial scan would pass every assertion above while proving nothing")
                .hasSizeGreaterThanOrEqualTo(55);
    }


    @Test
    void everyExclusionNamesARouteThatIsActuallyRegistered() {
        Set<String> oldRoutes = routesUnder(OLD_ROOT).keySet();

        assertThat(new TreeSet<>(WITHOUT_A_TWIN))
                .as(
                        "an exclusion naming no registered mapping would silently exempt nothing and"
                                + " let a retired route linger in the list")
                .allMatch(oldRoutes::contains);
    }


    private Map<String, HandlerMethod> routesUnder(String root) {
        Map<String, HandlerMethod> routes = new LinkedHashMap<>();
        handlers
                .getHandlerMethods()
                .forEach(
                        (info, handler) ->
                                patternsOf(info).stream()
                                        .filter(pattern -> pattern.startsWith(root + "/") || pattern.equals(root))
                                        .forEach(
                                                pattern ->
                                                        methodsOf(info)
                                                                .forEach(
                                                                        method ->
                                                                                routes.put(
                                                                                        method + " " + pattern,
                                                                                        handler))));
        return routes;
    }


    private Map<String, Set<HandlerMethod>> shapesUnder(String root) {
        Map<String, Set<HandlerMethod>> shapes = new LinkedHashMap<>();
        routesUnder(root)
                .forEach(
                        (route, handler) ->
                                shapes
                                        .computeIfAbsent(shapeOf(route), key -> new LinkedHashSet<>())
                                        .add(handler));
        return shapes;
    }


    private static String shapeOf(String route) {
        return route.replaceAll("\\{[^}/]+\\}", "{}");
    }


    private static List<String> patternsOf(RequestMappingInfo info) {
        if (info.getPathPatternsCondition() != null) {
            return info.getPathPatternsCondition().getPatterns().stream()
                    .map(Object::toString)
                    .sorted()
                    .toList();
        }
        return info.getPatternValues().stream().sorted().toList();
    }


    private static List<String> methodsOf(RequestMappingInfo info) {
        return info.getMethodsCondition().getMethods().stream()
                .map(Enum::name)
                .sorted(Comparator.naturalOrder())
                .toList();
    }


    private static String twinOf(String route) {
        return route.replace(OLD_ROOT, NEW_ROOT);
    }


    private static boolean servedOnlyBy(Set<HandlerMethod> handlers, HandlerMethod expected) {
        return handlers.size() == 1 && handlers.contains(expected);
    }


    private static String describe(HandlerMethod handler) {
        return handler.getBeanType().getSimpleName() + "#" + handler.getMethod().getName();
    }


    private static String describeAll(Set<HandlerMethod> handlers) {
        return handlers.stream().map(TripGrammarTwinIT::describe).sorted().toList().toString();
    }
}
