package com.largata.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;

import com.largata.support.PostgresTestBase;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;


@SpringBootTest
class VanityAllocationRollbackIT extends PostgresTestBase {

    @Autowired private TravelerService travelers;
    @Autowired private JdbcTemplate jdbc;

    @MockitoSpyBean private TravelerRepository repository;


    @Test
    void aProvisioningThatFailsAfterTheClaimConsumesNoNumber() {
        int claimedBefore = claimedCount();
        doThrow(new IllegalStateException("the traveler write failed")).when(repository).saveAndFlush(any());

        assertThatThrownBy(() -> travelers.getOrProvision(claimsFor(freshUid())))
                .isInstanceOf(IllegalStateException.class);

        assertThat(claimedCount())
                .as("the claim shares the provisioning transaction, so a failed sign-up returns its "
                        + "number by atomicity rather than by any compensating write")
                .isEqualTo(claimedBefore);
    }


    private static TravelerClaims claimsFor(String uid) {
        return new TravelerClaims(uid, uid + "@example.com", "Rolled Back", null);
    }

    private int claimedCount() {
        return jdbc.queryForObject("SELECT count(*) FROM vanity_pool WHERE claimed_at IS NOT NULL", Integer.class);
    }

    private static String freshUid() {
        return "uid-" + UUID.randomUUID();
    }
}
