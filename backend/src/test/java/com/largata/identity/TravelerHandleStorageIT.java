package com.largata.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import com.largata.support.PostgresTestBase;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;


@SpringBootTest
class TravelerHandleStorageIT extends PostgresTestBase {

    @Autowired private JdbcTemplate jdbc;

    @Test
    void twoTravelersCannotShareAHandle() {
        String handle = freshHandle();
        plant(handle);

        assertThatExceptionOfType(DataIntegrityViolationException.class).isThrownBy(() -> plant(handle));
    }

    @Test
    void twoTravelersCannotShareAHandleThatDiffersOnlyByCASE() {
        String handle = freshHandle();
        plant(handle);

        assertThatExceptionOfType(DataIntegrityViolationException.class)
                .as("this is the assertion the constraint exists for: a plain UNIQUE (handle) would "
                        + "let 'Ana' and 'ana' both land, and every other test here would still pass")
                .isThrownBy(() -> plant(handle.toUpperCase(java.util.Locale.ROOT)));
    }

    @Test
    void theIndexIsBuiltOnLowerHandleAndNotOnHandle() {
        String definition =
                jdbc.queryForObject(
                        "SELECT indexdef FROM pg_indexes WHERE indexname = 'traveler_handle_idx'", String.class);

        assertThat(definition)
                .as("the case-insensitive semantics live in the index expression; if this moves to a "
                        + "plain (handle) the constraint quietly means something narrower")
                .contains("lower(handle)");
    }

    @Test
    void manyTravelersMayHaveNoHandleAtAll() {
        assertThatCode(
                        () -> {
                            plant(null);
                            plant(null);
                            plant(null);
                        })
                .as("every pre-S4.0 row has a NULL handle and must stay legal without a backfill")
                .doesNotThrowAnyException();
    }

    @Test
    void releasingAHandleMakesItImmediatelyClaimableByAnotherAccount() {
        String handle = freshHandle();
        UUID first = plant(handle);
        UUID second = plant(null);

        jdbc.update("UPDATE traveler SET handle = NULL WHERE id = ?", first);

        assertThatCode(() -> jdbc.update("UPDATE traveler SET handle = ? WHERE id = ?", handle, second))
                .as("ADR-015: no tombstone, no cooldown - the id is the identifier, so release is free")
                .doesNotThrowAnyException();
    }

    private UUID plant(String handle) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "INSERT INTO traveler (id, firebase_uid, email, display_name, created_at, handle) "
                        + "VALUES (?, ?, ?, ?, now(), ?)",
                id,
                "uid-" + id,
                id + "@example.com",
                "Planted",
                handle);
        return id;
    }

    private static String freshHandle() {
        return "h" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}
