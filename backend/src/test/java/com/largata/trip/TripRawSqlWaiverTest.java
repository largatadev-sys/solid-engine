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

    private static final String THE_ONE_CLASS_THAT_MAY_HOLD_SQL = "ForeignWorkspaceRows.java";

    private static final Pattern A_TABLE_NAME =
            Pattern.compile("(?:DELETE FROM|INSERT INTO|UPDATE|JOIN|FROM)\\s+([a-z_][a-z_0-9]*)");

    private static final Pattern A_QUOTED_TABLE = Pattern.compile("\"([a-z_][a-z_0-9]*)\"");

    @Test
    void rawSqlLivesInOneRepositoryClassAndNoService() {
        List<String> elsewhere =
                javaFilesUnder(TRIP)
                        .filter(file -> !file.getFileName().toString().equals(THE_ONE_CLASS_THAT_MAY_HOLD_SQL))
                        .filter(file -> read(file).contains("JdbcClient"))
                        .map(Path::toString)
                        .toList();

        assertThat(elsewhere)
                .as("TW-1 retired the raw-SQL facade and every read is over its slice's own"
                        + " repositories. What SQL remains is not a service's to hold: it lives in"
                        + " ForeignWorkspaceRows, which is a repository in everything but the"
                        + " annotation - queries only, zero decisions - because Spring Data cannot"
                        + " reach tables this module has no entity for, and ADR-038 rule 1 forbids"
                        + " it having one. A service that grows a JdbcClient is a service doing the"
                        + " persistence layer's job")
                .isEmpty();
    }


    @Test
    void theRawSqlNeverNamesATableTheTripModuleOwns() {
        Set<String> own = new TreeSet<>(tablesNamedInTheForeignRows());
        own.retainAll(TRIPS_OWN_TABLES);

        assertThat(own)
                .as("the waiver exists for tables another module owns. A trip table appearing here"
                        + " is raw SQL written where a repository would do, which is how the facade"
                        + " grew in the first place - the six that were inherited from it became"
                        + " repository calls at the founder's ruling, 2026-09-08")
                .isEmpty();
    }

    @Test
    void destructionsForeignTablesAreExactlyTheWaiveredFive() {
        Set<String> foreign = new TreeSet<>(tablesNamedInTheForeignRows());
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
        assertThat(tablesNamedInTheForeignRows())
                .as("a scan reading no table would pass every rule above while checking nothing")
                .hasSize(THE_FOREIGN_TABLES_DESTRUCTION_DELETES_FROM.size());
        assertThat(javaFilesUnder(TRIP).count())
                .as("and an empty module would make the first rule vacuous")
                .isGreaterThan(100);
    }

    private static Set<String> tablesNamedInTheForeignRows() {
        String source = read(TRIP.resolve("destruction/" + THE_ONE_CLASS_THAT_MAY_HOLD_SQL));
        Set<String> tables = new TreeSet<>();
        Matcher inStatements = A_TABLE_NAME.matcher(source);
        while (inStatements.find()) {
            tables.add(inStatements.group(1));
        }
        Matcher inTheLoopsList = A_QUOTED_TABLE.matcher(theForeignTableList(source));
        while (inTheLoopsList.find()) {
            tables.add(inTheLoopsList.group(1));
        }
        return tables;
    }

    private static String theForeignTableList(String source) {
        int from = source.indexOf("HANGING_OFF_THE_WORKSPACE");
        if (from < 0) {
            throw new IllegalStateException(
                    "the foreign rows no longer name the workspace's children in one list — the"
                            + " scan this waiver rests on has stopped seeing what it claims to read");
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
