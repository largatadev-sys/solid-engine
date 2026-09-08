package com.largata.trip;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;


class TripRawSqlWaiverTest {

    private static final Path TRIP = Path.of("src/main/java/com/largata/trip");

    private static final Set<String> TRIPS_OWN_TABLES =
            Set.of(
                    "itinerary", "day", "activity", "edit_lease", "activity_history", "workspace",
                    "membership", "ownership_offer", "ownership_transfer");

    private static final Set<String> THE_FOREIGN_TABLES_DESTRUCTION_DELETES_FROM =
            Set.of("poll", "invitation", "join_request", "join_link", "chat_message");

    private static final Pattern A_TABLE_NAME =
            Pattern.compile("(?:DELETE FROM|INSERT INTO|UPDATE|JOIN|FROM)\s+([a-z_][a-z_0-9]*)");

    private static final Pattern A_QUOTED_TABLE = Pattern.compile("\"([a-z_][a-z_0-9]*)\"");

    @Test
    void rawSqlLivesOnlyInTheDestructionService() {
        List<String> elsewhere =
                javaFilesUnder(TRIP)
                        .filter(file -> !file.getFileName().toString().equals("TripDestructionService.java"))
                        .filter(file -> read(file).contains("JdbcClient"))
                        .map(Path::toString)
                        .toList();

        assertThat(elsewhere)
                .as("TW-1 retired the raw-SQL facade: every read is now over its slice's own"
                        + " repositories. Destruction keeps its SQL because the foreign keys it"
                        + " satisfies cannot be dropped until the schema move")
                .isEmpty();
    }

    @Test
    void destructionsForeignTablesAreExactlyTheWaiveredFive() {
        Set<String> foreign = new TreeSet<>(tablesNamedInDestruction());
        foreign.removeAll(TRIPS_OWN_TABLES);

        assertThat(foreign)
                .as("the waiver narrowed at TW-1 from twelve tables to the foreign ones destruction"
                        + " deletes from — invitation, poll and join carry NOT NULL REFERENCES"
                        + " workspace, so an event-driven destruction is impossible before those"
                        + " keys drop. A sixth foreign table is a change to the waiver and is"
                        + " argued as one; the trigger is the foreign-key-drop story")
                .containsExactlyInAnyOrderElementsOf(THE_FOREIGN_TABLES_DESTRUCTION_DELETES_FROM);
    }

    @Test
    void theScanFindsTheStatementsItClaimsToRead() {
        assertThat(tablesNamedInDestruction())
                .as("a scan reading no table would pass both rules above while checking nothing")
                .hasSizeGreaterThan(8);
        assertThat(javaFilesUnder(TRIP).count())
                .as("and an empty module would make the first rule vacuous")
                .isGreaterThan(100);
    }

    private static Set<String> tablesNamedInDestruction() {
        String source = read(TRIP.resolve("destruction/TripDestructionService.java"));
        Set<String> tables = new TreeSet<>();
        Matcher inStatements = A_TABLE_NAME.matcher(source);
        while (inStatements.find()) {
            tables.add(inStatements.group(1));
        }
        Matcher inTheLoopsList = A_QUOTED_TABLE.matcher(theWorkspaceChildrenList(source));
        while (inTheLoopsList.find()) {
            tables.add(inTheLoopsList.group(1));
        }
        return tables;
    }

    private static String theWorkspaceChildrenList(String source) {
        int from = source.indexOf("for (String workspaceTable");
        if (from < 0) {
            throw new IllegalStateException(
                    "destruction no longer loops over the workspace's children by name — the scan"
                            + " this waiver rests on has stopped seeing what it claims to read");
        }
        int to = source.indexOf(')', source.indexOf("List.of(", from));
        return source.substring(from, to);
    }


    private static Stream<Path> javaFilesUnder(Path root) {
        try {
            return Files.walk(root)
                    .filter(Files::isRegularFile)
                    .filter(path -> path.getFileName().toString().endsWith(".java"))
                    .toList()
                    .stream();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static String read(Path file) {
        try {
            return Files.readString(file);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
