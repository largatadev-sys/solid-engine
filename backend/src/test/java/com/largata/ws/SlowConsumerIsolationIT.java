package com.largata.ws;

import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.DeafWsSocket;
import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import com.largata.support.TripRig;
import com.largata.support.WsRig;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.client.RestTestClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@org.springframework.context.annotation.Import(TestJwtSupport.Config.class)
@ActiveProfiles("dev")
class SlowConsumerIsolationIT extends PostgresTestBase {

    private static final Duration PATIENCE = Duration.ofSeconds(10);

    private static final int FRAMES_TO_STALL_A_SOCKET = Session.SEND_QUEUE_LIMIT * 40;

    private static final int BULK_BODY = 1_900;

    private static final int FILLERS = 4;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @Autowired private SessionRegistry registry;

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
    void aTravelersWriteCompletesWhileACoMembersConnectionHasStoppedReading() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("slowo" + tag);
        String trip = tripRig.createTrip(owner, 2);
        String stalled = tripRig.joinAsMember(owner, trip, "slowm" + tag);
        String bystander = tripRig.joinAsMember(owner, trip, "slowb" + tag);

        try (DeafWsSocket deaf = DeafWsSocket.handshakeThenStopReading(rig.urlFor(rig.mintTicket(stalled)))) {
            subscribeBlind(deaf, trip);
            List<Thread> fillers = fillingInTheBackground(trip, owner);

            try {
                Duration took = timeOneWriteOnceTheStallHasSetIn(bystander, trip);

                assertThat(took)
                        .as("A third traveler writes while a co-member's socket is being written to"
                                + " and has stopped reading. NOT YET A PROOF: measured at S4.35"
                                + " ticket 01, this passes against the UNFIXED synchronous dispatcher"
                                + " — the bounded queue drops the deaf session at ~2.1MB in flight"
                                + " before any socket write blocks the caller. It is kept as the"
                                + " harness the decision needs, and must be made to fail before it"
                                + " may be cited as evidence for anything.")
                        .isLessThan(PATIENCE);
            } finally {
                stopFilling(fillers);
            }
        }
    }

    @Test
    void theStalledSessionIsClosedAsASlowConsumerRatherThanBufferedForever() throws Exception {
        String tag = WsRig.tag();
        String owner = tripRig.travelerWithHandle("slocl" + tag);
        String trip = tripRig.createTrip(owner, 2);
        String stalled = tripRig.joinAsMember(owner, trip, "slocm" + tag);

        try (DeafWsSocket deaf = DeafWsSocket.handshakeThenStopReading(rig.urlFor(rig.mintTicket(stalled)))) {
            subscribeBlind(deaf, trip);
            List<Thread> fillers = fillingInTheBackground(trip, owner);

            try {
                assertThat(theSessionIsDroppedWithin(trip, Duration.ofSeconds(60)))
                        .as("The queue is bounded at SEND_QUEUE_LIMIT and overflow closes the session."
                                + " Moving the drain off the caller's thread must not turn that bound"
                                + " into an unbounded backlog held on behalf of a socket nobody reads."
                                + " The registry is the witness because a socket that never reads"
                                + " cannot report its own close frame.")
                        .isTrue();
            } finally {
                stopFilling(fillers);
            }
        }
    }

    private boolean theSessionIsDroppedWithin(String trip, Duration window) throws InterruptedException {
        Topic topic = Topic.ofItinerary(UUID.fromString(trip), "chat");
        long deadline = System.nanoTime() + window.toNanos();
        while (System.nanoTime() < deadline) {
            if (registry.subscribersOf(topic).isEmpty()) {
                return true;
            }
            Thread.sleep(100);
        }
        return false;
    }

    private Duration timeOneWriteOnceTheStallHasSetIn(String token, String trip) throws Exception {
        Thread.sleep(Duration.ofSeconds(3).toMillis());
        long startedAt = System.nanoTime();
        chat(token, trip, "the write that must not wait");
        return Duration.ofNanos(System.nanoTime() - startedAt);
    }

    private List<Thread> fillingInTheBackground(String trip, String owner) {
        List<Thread> fillers = new ArrayList<>();
        for (int worker = 0; worker < FILLERS; worker++) {
            Thread filler =
                    new Thread(
                            () -> {
                                for (int i = 0; i < FRAMES_TO_STALL_A_SOCKET / FILLERS; i++) {
                                    if (Thread.currentThread().isInterrupted()) {
                                        return;
                                    }
                                    try {
                                        chat(owner, trip, bulky("filler-" + i));
                                    } catch (RuntimeException stopped) {
                                        return;
                                    }
                                }
                            });
            filler.setDaemon(true);
            filler.start();
            fillers.add(filler);
        }
        return fillers;
    }

    private void stopFilling(List<Thread> fillers) throws InterruptedException {
        for (Thread filler : fillers) {
            filler.interrupt();
        }
        for (Thread filler : fillers) {
            filler.join(Duration.ofMinutes(2).toMillis());
        }
    }

    private void chat(String token, String trip, String text) {
        tripRig
                .send(
                        HttpMethod.POST,
                        "/v1/itineraries/" + trip + "/chat/messages",
                        token,
                        "{\"body\":\"" + text + "\"}")
                .expectStatus()
                .isCreated();
    }

    private static String bulky(String label) {
        return label + "-".repeat(Math.max(0, BULK_BODY - label.length()));
    }

    private void subscribeBlind(DeafWsSocket client, String trip) throws InterruptedException {
        client.send(WsRig.subscribeTo(WsRig.chatTopic(trip)));
        waitForRegistration(trip);
    }

    private void waitForRegistration(String trip) throws InterruptedException {
        Topic topic = Topic.ofItinerary(UUID.fromString(trip), "chat");
        for (int attempt = 0; attempt < 100; attempt++) {
            if (!registry.subscribersOf(topic).isEmpty()) {
                return;
            }
            Thread.sleep(50);
        }
        throw new AssertionError(
                "The subscription never registered. A client that has stopped reading cannot"
                        + " acknowledge its own subscription, so the registry is the only witness"
                        + " available — and a test that proceeded without it would prove nothing,"
                        + " since an unsubscribed socket receives no frames to stall on.");
    }
}
