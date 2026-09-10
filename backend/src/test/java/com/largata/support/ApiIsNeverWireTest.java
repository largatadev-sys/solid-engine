package com.largata.support;

import static org.assertj.core.api.Assertions.assertThat;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.JavaMethod;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;
import org.junit.jupiter.api.Test;


class ApiIsNeverWireTest {

    private static final String REST_CONTROLLER =
            "org.springframework.web.bind.annotation.RestController";

    private static final java.util.regex.Pattern AN_API_PACKAGE =
            java.util.regex.Pattern.compile("^com\\.largata\\.(\\w+)\\.api(\\..*)?$");

    private static final Map<String, String> OUTSIDE_THE_RULE =
            Map.of(
                    "common",
                            "shared kernel - Page<T> is the pagination envelope every paged endpoint"
                                + " returns, and common predates the api/dto split (ADR-038"
                                + " classification, ModuleGuardMetaTest)",
                    "identity",
                            "shared kernel - MeResponse and the traveler cards are named by 133"
                                + " controller signatures; the RequestPrincipal story on the epic map"
                                + " owns the split that would give identity a dto",
                    "ws",
                            "transport - ConnectionTicketResponse is the handshake's own wire and ws"
                                + " carries other modules' events (ADR-038 classification)",
                    "health",
                            "five files, outside the rule by size - HealthResponse is the liveness"
                                + " body and health has no dto");

    private final JavaClasses largata =
            new ClassFileImporter()
                    .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                    .importPackages("com.largata");

    @Test
    void noApiTypeOfAModuleUnderTheRuleAppearsInAControllerSignature() {
        assertThat(wireTypesFoundInApiPackages())
                .as(
                        "ADR-038 rule 1 as amended on 11/09/2026: a type is api only if another"
                            + " module calls it in-process, a type is dto if it appears in a"
                            + " controller signature, and never both. This is that rule as a"
                            + " property of the build rather than a convention each module"
                            + " remembers. It is stated over the modules UNDER the rule: the four"
                            + " ADR-038 classifies outside it are excluded BY MODULE with their"
                            + " reason, never by naming a class, so the meta-test's"
                            + " no-by-name-exemption rule still holds and a module invented"
                            + " tomorrow is covered the day it is created")
                .isEmpty();
    }


    @Test
    void theRuleIsScopedByClassificationRatherThanByNamingClasses() {
        for (Map.Entry<String, String> outside : OUTSIDE_THE_RULE.entrySet()) {
            assertThat(outside.getValue())
                    .as(
                            "%s is excluded because ADR-038 classifies it outside the layout rule,"
                                + " so it carries the reason - an exclusion without one is how a"
                                + " breach hides",
                            outside.getKey())
                    .isNotBlank();
        }
        assertThat(OUTSIDE_THE_RULE.keySet())
                .as(
                        "the shared kernel, the transport and the five-file module - the same four"
                            + " ModuleGuardMetaTest classifies outside the rule, plus health, and"
                            + " nothing else")
                .containsExactlyInAnyOrder("common", "identity", "ws", "health");
    }


    @Test
    void theScanFoundControllersAndFoundApiPackages() {
        assertThat(largata.stream().filter(c -> c.isAnnotatedWith(REST_CONTROLLER)).count())
                .as("a scan that found no controllers would report no wire types and prove nothing")
                .isGreaterThan(30);
        assertThat(
                        largata.stream()
                                .filter(c -> AN_API_PACKAGE.matcher(c.getPackageName()).matches())
                                .count())
                .as("...and so would one that found controllers but no api package to check them against")
                .isGreaterThan(30);
        assertThat(modulesWithAnApiPackage())
                .as(
                        "...and the modules under the rule must still have api packages among them,"
                            + " or this rule is checking only the four it excludes")
                .isNotEmpty();
    }


    private List<String> wireTypesFoundInApiPackages() {
        List<String> found = new ArrayList<>();
        for (JavaClass controller : largata) {
            if (!controller.isAnnotatedWith(REST_CONTROLLER)) {
                continue;
            }
            for (JavaMethod method : controller.getMethods()) {
                List<JavaClass> signature =
                        new ArrayList<>(method.getReturnType().getAllInvolvedRawTypes());
                for (JavaClass parameter : method.getRawParameterTypes()) {
                    signature.addAll(parameter.getAllInvolvedRawTypes());
                }
                for (JavaClass type : signature) {
                    String module = moduleOfApiPackage(type);
                    if (module != null && !OUTSIDE_THE_RULE.containsKey(module)) {
                        found.add(
                                type.getName()
                                        + " is named by "
                                        + controller.getSimpleName()
                                        + "."
                                        + method.getName()
                                        + " - it is wire, so it belongs in "
                                        + module
                                        + ".dto");
                    }
                }
            }
        }
        return found.stream().distinct().sorted().toList();
    }


    private TreeSet<String> modulesWithAnApiPackage() {
        TreeSet<String> modules = new TreeSet<>();
        for (JavaClass type : largata) {
            String module = moduleOfApiPackage(type);
            if (module != null && !OUTSIDE_THE_RULE.containsKey(module)) {
                modules.add(module);
            }
        }
        return modules;
    }


    private static String moduleOfApiPackage(JavaClass type) {
        var matched = AN_API_PACKAGE.matcher(type.getPackageName());
        return matched.matches() ? matched.group(1) : null;
    }
}
