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
class FollowRequestStorageIT extends PostgresTestBase {

    @Autowired private TravelerService travelers;
    @Autowired private TravelerProfileService profiles;
    @Autowired private FollowRequestService requests;
    @Autowired private JdbcTemplate jdbc;


    @Test
    void aPendingRequestStoresItsStatusAsTheEnumNameInUpperCase() {
        UUID requester = onboarded();
        UUID target = privateTraveler();

        requests.askOrFind(requester, target);

        assertThat(statusOf(requester, target))
                .as("the partial unique index is a WHERE on this literal — wrong casing enforces nothing")
                .isEqualTo("PENDING");
    }


    @Test
    void everyDecisionStoresItsOwnName() {
        UUID target = privateTraveler();

        UUID approved = onboarded();
        requests.askOrFind(approved, target);
        requests.approve(target, approved);
        assertThat(statusOf(approved, target)).isEqualTo("APPROVED");

        UUID declined = onboarded();
        requests.askOrFind(declined, target);
        requests.decline(target, declined);
        assertThat(statusOf(declined, target)).isEqualTo("DECLINED");

        UUID cancelled = onboarded();
        requests.askOrFind(cancelled, target);
        follows().unfollow(cancelled, target);
        assertThat(statusOf(cancelled, target)).isEqualTo("CANCELLED");
    }


    @Test
    void theIndexPermitsOnlyOnePendingRowPerPair() {
        UUID requester = onboarded();
        UUID target = privateTraveler();
        requests.askOrFind(requester, target);

        assertThatThrownBy(() -> insertPendingDirectly(requester, target))
                .as("one pending per pair is what makes a double-tap idempotent by construction")
                .isInstanceOf(DataIntegrityViolationException.class);
    }


    @Test
    void theIndexPermitsAFreshPendingRowBesideADecidedOne() {
        UUID requester = onboarded();
        UUID target = privateTraveler();
        requests.askOrFind(requester, target);
        requests.decline(target, requester);

        requests.askOrFind(requester, target);

        assertThat(rowCount(requester, target))
                .as("a decline is silent and re-requestable, so the index must be PARTIAL")
                .isEqualTo(2);
        assertThat(statusOf(requester, target)).isEqualTo("PENDING");
    }


    @Test
    void theDatabaseRefusesARequestToOneself() {
        UUID lonely = onboarded();

        assertThatThrownBy(() -> insertPendingDirectly(lonely, lonely))
                .as("the endpoint refuses it too; both layers are proven independently")
                .isInstanceOf(DataIntegrityViolationException.class);
    }


    @Autowired private FollowService followService;

    private FollowService follows() {
        return followService;
    }


    private String statusOf(UUID requester, UUID target) {
        return jdbc.queryForObject(
                "SELECT status FROM follow_request WHERE requester_id = ? AND target_id = ? "
                        + "ORDER BY requested_at DESC LIMIT 1",
                String.class,
                requester,
                target);
    }


    private int rowCount(UUID requester, UUID target) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM follow_request WHERE requester_id = ? AND target_id = ?",
                Integer.class,
                requester,
                target);
    }


    private void insertPendingDirectly(UUID requester, UUID target) {
        jdbc.update(
                "INSERT INTO follow_request (id, requester_id, target_id, status, requested_at) "
                        + "VALUES (?, ?, ?, 'PENDING', now())",
                UUID.randomUUID(),
                requester,
                target);
    }


    private UUID privateTraveler() {
        UUID id = onboarded();
        profiles.update(
                id,
                new ProfileEdit(
                        null, null, null, null, null, null, null, null, null, ProfileVisibility.PRIVATE));
        return id;
    }


    private UUID onboarded() {
        String uid = "uid-" + UUID.randomUUID();
        Traveler traveler = travelers.getOrProvision(TravelerClaims.of(uid, uid + "@example.com", null));
        return profiles.completeOnboarding(traveler.id()).id();
    }
}
