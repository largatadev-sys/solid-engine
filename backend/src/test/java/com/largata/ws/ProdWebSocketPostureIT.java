package com.largata.ws;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import com.largata.support.WsRig;
import com.largata.support.WsTestClient;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
class ProdWebSocketPostureIT extends PostgresTestBase {

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @Autowired private ApplicationContext context;

    private RestTestClient rest;
    private TripRig tripRig;
    private WsRig rig;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
        tripRig = new TripRig(rest, jdbc);
        rig = new WsRig(rest, port);
    }

    @Test
    void noDevOriginAllowlistBeanExistsSoBrowserOriginsAreRefusedAtTheHandshake() {
        String ticket = rig.mintTicket(tripRig.travelerWithHandle("pwso" + WsRig.tag()));

        assertThat(WsTestClient.refusedStatus(rig.urlFor(ticket), "http://localhost:8081")).isEqualTo(401);
    }

    @Test
    void aProductionBrowserOriginIsRefusedJustTheSame() {
        String ticket = rig.mintTicket(tripRig.travelerWithHandle("pwsp" + WsRig.tag()));

        assertThat(WsTestClient.refusedStatus(rig.urlFor(ticket), "https://founders.largata.com")).isEqualTo(401);
    }

    @Test
    void anAbsentOriginIsStillAdmittedBecauseNativeClientsSendNone() throws Exception {
        String ticket = rig.mintTicket(tripRig.travelerWithHandle("pwsn" + WsRig.tag()));

        try (WsTestClient client = WsTestClient.connect(rig.urlFor(ticket), null)) {
            client.send("{\"action\":\"teleport\"}");

            assertThat(client.awaitFrame()).contains(FrameCodes.UNKNOWN_ACTION);
        }
    }

    @Test
    void theDebugEchoTopicHasNoBeanOutsideDev() {
        assertThat(context.getBeanNamesForType(DebugEchoTopic.class)).isEmpty();
    }

    @Test
    void subscribingToTheDebugEchoTopicIsRefusedWhereItsBeanDoesNotExist() throws Exception {
        String ticket = rig.mintTicket(tripRig.travelerWithHandle("pwse" + WsRig.tag()));

        try (WsTestClient client = WsTestClient.connect(rig.urlFor(ticket), null)) {
            client.send("{\"action\":\"subscribe\",\"topic\":\"" + Topic.DEBUG_ECHO + "\"}");

            assertThat(client.awaitFrame()).contains(FrameCodes.TOPIC_NOT_FOUND);
        }
    }

    @Test
    void anEchoFrameIsRefusedWhereTheDebugTopicDoesNotExist() throws Exception {
        String ticket = rig.mintTicket(tripRig.travelerWithHandle("pwsx" + WsRig.tag()));

        try (WsTestClient client = WsTestClient.connect(rig.urlFor(ticket), null)) {
            client.send("{\"action\":\"echo\",\"payload\":\"nope\"}");

            assertThat(client.awaitFrame()).contains(FrameCodes.UNKNOWN_ACTION);
        }
    }



}
