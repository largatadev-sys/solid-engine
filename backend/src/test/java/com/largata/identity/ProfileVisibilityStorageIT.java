package com.largata.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.largata.support.PostgresTestBase;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;


@SpringBootTest
class ProfileVisibilityStorageIT extends PostgresTestBase {

    @Autowired private TravelerService travelers;
    @Autowired private TravelerProfileService profiles;
    @Autowired private JdbcTemplate jdbc;


    @Test
    void aFreshTravelerIsPublicWithoutAnybodySayingSo() {
        Traveler traveler = fresh();

        assertThat(traveler.profileVisibility()).isEqualTo(ProfileVisibility.PUBLIC);
        assertThat(storedVisibilityOf(traveler.id())).isEqualTo("PUBLIC");
    }


    @Test
    void theStoredSpellingIsTheEnumNameInUpperCase() {
        Traveler traveler = fresh();

        profiles.update(traveler.id(), visibility(ProfileVisibility.PRIVATE));

        assertThat(storedVisibilityOf(traveler.id()))
                .as("@Enumerated(STRING) writes the NAME, and the CHECK constraint tests this literal")
                .isEqualTo("PRIVATE");
    }


    @Test
    void theFlipRoundTripsBothWays() {
        Traveler traveler = fresh();

        profiles.update(traveler.id(), visibility(ProfileVisibility.PRIVATE));
        assertThat(reload(traveler).profileVisibility()).isEqualTo(ProfileVisibility.PRIVATE);

        profiles.update(traveler.id(), visibility(ProfileVisibility.PUBLIC));
        assertThat(reload(traveler).profileVisibility()).isEqualTo(ProfileVisibility.PUBLIC);
    }


    @Test
    void anEditThatMentionsNoVisibilityLeavesItAlone() {
        Traveler traveler = fresh();
        profiles.update(traveler.id(), visibility(ProfileVisibility.PRIVATE));

        profiles.update(
                traveler.id(),
                new ProfileEdit(null, "Renamed", null, null, null, null, null, null, null, null));

        assertThat(reload(traveler).profileVisibility())
                .as("absent means unchanged, as every field on this patch")
                .isEqualTo(ProfileVisibility.PRIVATE);
    }


    @Test
    void theDatabaseRefusesASpellingNoEnumConstantWrites() {
        Traveler traveler = fresh();

        assertThatThrownBy(
                        () ->
                                jdbc.update(
                                        "UPDATE traveler SET profile_visibility = 'friends' WHERE id = ?",
                                        traveler.id()))
                .as("a third spelling would fail OPEN — the read rule would call them public")
                .isInstanceOf(DataIntegrityViolationException.class);
    }


    private String storedVisibilityOf(UUID travelerId) {
        return jdbc.queryForObject(
                "SELECT profile_visibility FROM traveler WHERE id = ?", String.class, travelerId);
    }


    private static ProfileEdit visibility(ProfileVisibility wanted) {
        return new ProfileEdit(null, null, null, null, null, null, null, null, null, wanted);
    }


    private Traveler fresh() {
        String uid = "uid-" + UUID.randomUUID();
        return travelers.getOrProvision(TravelerClaims.of(uid, uid + "@example.com", null));
    }


    private Traveler reload(Traveler traveler) {
        return travelers.getOrProvision(
                TravelerClaims.of(traveler.firebaseUid(), traveler.email(), traveler.displayName()));
    }
}
