package com.largata.place;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.manyTimes;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.largata.place.api.PlaceCandidate;
import com.largata.place.api.PlaceSearchUnavailableException;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.client.RequestMatcher;
import org.springframework.web.client.RestClient;


class PhotonPlaceSuggesterTest {

    private static final String SEARCH = "https://photon.test/api";

    private static final String REVERSE = "https://photon.test/reverse";

    private static final BigDecimal LAGOON_LAT = new BigDecimal("11.1949");

    private static final BigDecimal LAGOON_LNG = new BigDecimal("119.4013");

    private static final RequestMatcher WHATEVER_IS_ASKED = request -> {};

    private static PhotonPlaceSuggester answering(String body) {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer.bindTo(builder)
                .build()
                .expect(manyTimes(), WHATEVER_IS_ASKED)
                .andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
        return photon(builder);
    }


    private static PhotonPlaceSuggester photon(RestClient.Builder builder) {
        return new PhotonPlaceSuggester(builder, SEARCH, REVERSE, "Largata/test");
    }


    @Test
    void geoJsonPutsLONGITUDEFirst_andReadingItBackwardsPutsEveryPinInTheWrongHemisphere() {
        PlaceCandidate found =
                answering(
                                """
                                {"features":[{"geometry":{"coordinates":[119.4013,11.1949]},
                                  "properties":{"name":"Big Lagoon","city":"El Nido","state":"Palawan",
                                                "country":"Philippines","osm_value":"water"}}]}
                                """)
                        .suggest("lagoon", null, null)
                        .get(0);

        assertThat(found.latitude()).isEqualByComparingTo(LAGOON_LAT);
        assertThat(found.longitude()).isEqualByComparingTo(LAGOON_LNG);
        assertThat(found.name()).isEqualTo("Big Lagoon");
        assertThat(found.kind()).isEqualTo("water");
    }


    @Test
    void theContextReadsCityStateCountry_theWayATravelerWouldSayIt() {
        assertThat(
                        answering(
                                        """
                                        {"features":[{"geometry":{"coordinates":[119.4,11.1]},
                                          "properties":{"name":"Big Lagoon","city":"El Nido",
                                                        "state":"Palawan","country":"Philippines"}}]}
                                        """)
                                .suggest("lagoon", null, null)
                                .get(0)
                                .context())
                .isEqualTo("El Nido, Palawan, Philippines");
    }


    @Test
    void aCityThatIsAlsoItsOwnStateIsNotSaidTwice() {
        assertThat(
                        answering(
                                        """
                                        {"features":[{"geometry":{"coordinates":[103.8,1.35]},
                                          "properties":{"name":"Gardens by the Bay","city":"Singapore",
                                                        "state":"Singapore","country":"Singapore"}}]}
                                        """)
                                .suggest("gardens", null, null)
                                .get(0)
                                .context())
                .isEqualTo("Singapore");
    }


    @Test
    void aFeatureMissingEveryPartOfItsContextCarriesNULL_neverACommaSaladAndNeverAnEmptyString() {
        assertThat(
                        answering(
                                        """
                                        {"features":[{"geometry":{"coordinates":[119.4,11.1]},
                                          "properties":{"name":"Somewhere"}}]}
                                        """)
                                .suggest("somewhere", null, null)
                                .get(0)
                                .context())
                .as("PlaceCandidate folds a blank context to null, so the wire has ONE spelling for"
                        + " 'nowhere in particular' and the client's context line has one thing to test")
                .isNull();
    }


    @Test
    void anUnnamedFeatureFallsBackThroughStreetDistrictLocalityAndCity() {
        for (String field : new String[] {"street", "district", "locality", "city"}) {
            String body =
                    """
                    {"features":[{"geometry":{"coordinates":[119.4,11.1]},
                      "properties":{"%s":"Calle Real"}}]}
                    """
                            .formatted(field);

            assertThat(answering(body).suggest("real", null, null))
                    .as("Photon names a plain address by its %s, and a picker row with no name is broken", field)
                    .singleElement()
                    .extracting(PlaceCandidate::name)
                    .isEqualTo("Calle Real");
        }
    }


    @Test
    void aFeatureWithNoNameAtAllIsSkipped_ratherThanRenderedAsABlankRow() {
        assertThat(
                        answering(
                                        """
                                        {"features":[
                                          {"geometry":{"coordinates":[119.4,11.1]},
                                           "properties":{"country":"Philippines"}},
                                          {"geometry":{"coordinates":[119.5,11.2]},
                                           "properties":{"name":"Kept"}}]}
                                        """)
                                .suggest("x", null, null))
                .singleElement()
                .extracting(PlaceCandidate::name)
                .isEqualTo("Kept");
    }


    @Test
    void aNameOfNothingButSpacesCountsAsNoName() {
        assertThat(
                        answering(
                                        """
                                        {"features":[{"geometry":{"coordinates":[119.4,11.1]},
                                          "properties":{"name":"   ","city":"El Nido"}}]}
                                        """)
                                .suggest("x", null, null)
                                .get(0)
                                .name())
                .as("a whitespace name renders as an empty, untappable row")
                .isEqualTo("El Nido");
    }


    @Test
    void aFeatureWithHalfACoordinateIsSkipped_becauseHalfAPointIsNotAPlace() {
        assertThat(
                        answering(
                                        """
                                        {"features":[{"geometry":{"coordinates":[119.4]},
                                          "properties":{"name":"Nowhere"}}]}
                                        """)
                                .suggest("nowhere", null, null))
                .isEmpty();
    }


    @Test
    void aBodyWithNoFeaturesIsAnEmptyList_notACrash() {
        assertThat(answering("{}").suggest("nothing", null, null)).isEmpty();
        assertThat(answering("{\"features\":[]}").suggest("nothing", null, null)).isEmpty();
    }


    @Test
    void theSearchAsksTheSearchUrlForOurPageSize() {
        expecting(SEARCH + "?q=lagoon&limit=" + PhotonPlaceSuggester.MAX_RESULTS)
                .suggest("lagoon", null, null);
    }


    @Test
    void aBiasedSearchCarriesThePointToBiasTowards() {
        expecting(
                        SEARCH + "?q=lagoon&limit=" + PhotonPlaceSuggester.MAX_RESULTS
                                + "&lat=11.1949&lon=119.4013")
                .suggest("lagoon", LAGOON_LAT, LAGOON_LNG);
    }


    @Test
    void halfABiasIsNoBias_soOneMissingCoordinateNeverSendsA_nullUpstream() {
        expecting(SEARCH + "?q=lagoon&limit=" + PhotonPlaceSuggester.MAX_RESULTS)
                .suggest("lagoon", LAGOON_LAT, null);
    }


    @Test
    void namingAPointAsksTheReverseUrl_withNoRadiusAtAll() {
        expecting(REVERSE + "?lat=11.1949&lon=119.4013&limit=1").nameFor(LAGOON_LAT, LAGOON_LNG);
    }


    @Test
    void theNearbyLookupWidensTheSearchToItsRadius() {
        expecting(
                        REVERSE + "?lat=11.1949&lon=119.4013&limit=1&radius="
                                + PhotonPlaceSuggester.NEARBY_RADIUS_KM)
                .nearestTo(LAGOON_LAT, LAGOON_LNG);
    }


    @Test
    void aReverseLookupThatFindsNothingIsNull_notAnException() {
        PhotonPlaceSuggester photon = answering("{\"features\":[]}");

        assertThat(photon.nameFor(LAGOON_LAT, LAGOON_LNG)).isNull();
        assertThat(photon.nearestTo(LAGOON_LAT, LAGOON_LNG)).isNull();
    }


    @Test
    void aReverseLookupReadsTheSameShapeASearchDoes() {
        PlaceCandidate here =
                answering(
                                """
                                {"features":[{"geometry":{"coordinates":[119.4013,11.1949]},
                                  "properties":{"name":"Big Lagoon","city":"El Nido"}}]}
                                """)
                        .nameFor(LAGOON_LAT, LAGOON_LNG);

        assertThat(here.name()).isEqualTo("Big Lagoon");
        assertThat(here.latitude()).isEqualByComparingTo(LAGOON_LAT);
        assertThat(here.context()).isEqualTo("El Nido");
    }


    @Test
    void anUpstreamThatFailsBecomesADefinedOutcome_neverALeakedRestClientException() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer.bindTo(builder)
                .build()
                .expect(manyTimes(), WHATEVER_IS_ASKED)
                .andRespond(withServerError());
        PhotonPlaceSuggester photon = photon(builder);

        assertThatThrownBy(() -> photon.suggest("lagoon", null, null))
                .isInstanceOf(PlaceSearchUnavailableException.class)
                .hasMessageContaining("did not answer");
        assertThatThrownBy(() -> photon.nameFor(LAGOON_LAT, LAGOON_LNG))
                .isInstanceOf(PlaceSearchUnavailableException.class);
        assertThatThrownBy(() -> photon.nearestTo(LAGOON_LAT, LAGOON_LNG))
                .isInstanceOf(PlaceSearchUnavailableException.class);
    }


    private static PhotonPlaceSuggester expecting(String url) {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer.bindTo(builder)
                .build()
                .expect(requestTo(url))
                .andRespond(withSuccess("{\"features\":[]}", MediaType.APPLICATION_JSON));
        return photon(builder);
    }
}
