package com.largata.support;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;


class ShortHandlesTest {

    @Test
    void mintingWalksPastEveryCandidateSomethingElseAlreadyHolds() {
        List<String> offered = new ArrayList<>();

        String minted =
                ShortHandles.firstUnclaimed(
                        candidate -> {
                            offered.add(candidate);
                            return offered.size() > 2;
                        });

        assertThat(offered)
                .as("two IT classes each minted two-character handles from their own counter and "
                        + "collided on 'aa' against the shared database; a minter that takes its "
                        + "first candidate regardless would offer one and stop")
                .hasSize(3)
                .doesNotHaveDuplicates();
        assertThat(minted).isEqualTo(offered.get(2));
    }


    @Test
    void everyCandidateIsTwoLowercaseLetters() {
        List<String> offered = new ArrayList<>();

        ShortHandles.firstUnclaimed(
                candidate -> {
                    offered.add(candidate);
                    return offered.size() > 30;
                });

        assertThat(offered)
                .as("the minting minimum is three characters, so a two-character handle is exactly "
                        + "what only a founder row can hold")
                .allMatch(candidate -> candidate.matches("[a-z]{2}"));
    }
}
