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
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestJwtSupport.Config.class)
@ActiveProfiles("dev")
class DevOriginPostureIT extends PostgresTestBase {

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @Autowired private OriginPolicy resolvedPolicy;

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
    void theDevAllowlistWinsOverTheRefuseEverythingDefault() {
        assertThat(resolvedPolicy.admits("http://localhost:8081"))
                .as("Two OriginPolicy beans exist: the dev allowlist and the conditional"
                        + " refuse-everything default. If the default were to win here, the dev"
                        + " preview would silently fail its handshake on every browser origin.")
                .isTrue();
    }

    @Test
    void theExpoWebPreviewOriginIsAdmittedAtTheHandshake() throws Exception {
        String ticket = rig.mintTicket(tripRig.travelerWithHandle("dwso" + WsRig.tag()));

        try (WsTestClient client = WsTestClient.connect(rig.urlFor(ticket), "http://localhost:8081")) {
            client.send("{\"action\":\"teleport\"}");

            assertThat(client.awaitFrame()).contains(FrameCodes.UNKNOWN_ACTION);
        }
    }

    @Test
    void anOriginOutsideTheAllowlistIsStillRefusedInDev() {
        String ticket = rig.mintTicket(tripRig.travelerWithHandle("dwsx" + WsRig.tag()));

        assertThat(WsTestClient.refusedStatus(rig.urlFor(ticket), "https://evil.example")).isEqualTo(401);
    }

    @Test
    void theDebugEchoTopicExistsInDev() throws Exception {
        String ticket = rig.mintTicket(tripRig.travelerWithHandle("dwse" + WsRig.tag()));

        try (WsTestClient client = WsTestClient.connect(rig.urlFor(ticket), null)) {
            client.send("{\"action\":\"subscribe\",\"topic\":\"" + Topic.DEBUG_ECHO + "\"}");

            assertThat(client.awaitFrame()).contains("\"subscribed\"");
        }
    }



}
