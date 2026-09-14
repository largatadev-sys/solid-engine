package com.largata.mytrips;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.mytrips.dto.MyTripResponse;
import com.largata.trip.trip.dto.TripResponse;
import java.lang.reflect.RecordComponent;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;


class MyTripResponseKeepsTheTripWireShapeTest {

    @Test
    void theTwoRecordsNameTheSameFieldsInTheSameOrder() {
        assertThat(componentNames(MyTripResponse.class))
                .as("GET /v1/trips moved modules at S4.41 on the promise that its wire shape did not"
                        + " move. Jackson serialises a record in component order, so the two records"
                        + " agreeing on names AND order is what that promise means as a property of"
                        + " the build rather than a claim in a commit message. A field added to one"
                        + " and not the other is exactly the drift ADR-008 forbids")
                .containsExactlyElementsOf(componentNames(TripResponse.class));
    }


    @Test
    void theOnlyTypeDifferencesAreTheFourFieldsThisSurfaceNeverFills() {
        List<String> narrowed =
                Arrays.stream(MyTripResponse.class.getRecordComponents())
                        .filter(c -> c.getType() == Void.class
                                || c.getGenericType().getTypeName().equals("java.util.List<java.lang.Void>"))
                        .map(RecordComponent::getName)
                        .toList();

        assertThat(narrowed)
                .as("Void is the honest type for a field this surface always sends as null or [];"
                        + " the list of such fields is closed, and a fifth one appearing here means a"
                        + " field the summary used to populate has gone dark")
                .containsExactly("days", "lease", "editingSession", "forkedFrom");
    }


    @Test
    void everyOtherComponentKeepsItsType() {
        RecordComponent[] mine = MyTripResponse.class.getRecordComponents();
        RecordComponent[] theirs = TripResponse.class.getRecordComponents();

        for (int i = 0; i < mine.length; i++) {
            if (mine[i].getType() == Void.class || mine[i].getName().equals("days")) {
                continue;
            }
            assertThat(mine[i].getGenericType())
                    .as("component %s", mine[i].getName())
                    .isEqualTo(theirs[i].getGenericType());
        }
    }


    private static List<String> componentNames(Class<?> record) {
        return Arrays.stream(record.getRecordComponents()).map(RecordComponent::getName).toList();
    }
}
