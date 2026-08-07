package com.largata.media;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.ObjectStoreTestBase;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;


@SpringBootTest
class PhotoStorageIT extends ObjectStoreTestBase {

    @Autowired private JdbcTemplate jdbc;


    @Test
    void theSubjectKindSpellingMatchesWhatTheIndexPredicateNames() {
        List<String> predicateValues =
                jdbc.queryForList(
                        """
                        SELECT pg_get_expr(i.indpred, i.indrelid) AS predicate
                        FROM pg_index i
                        JOIN pg_class c ON c.oid = i.indexrelid
                        WHERE c.relname = 'photo_single_valued_subject_idx'
                        """,
                        String.class);

        assertThat(predicateValues).hasSize(1);
        String predicate = predicateValues.getFirst();
        assertThat(predicate).contains(PhotoSubject.TRAVELER_AVATAR.name());
        assertThat(predicate).contains(PhotoSubject.ITINERARY_COVER.name());
        assertThat(predicate).doesNotContain(PhotoSubject.ACTIVITY.name());
    }
}
