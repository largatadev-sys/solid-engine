package com.largata.report;

import static com.largata.support.TripRig.bearer;
import static org.assertj.core.api.Assertions.assertThat;

import com.largata.support.MutableClock;
import com.largata.support.PostgresTestBase;
import com.largata.support.TestJwtSupport;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;


@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({TestJwtSupport.Config.class, ReportRateLimitIT.SteppedClockConfig.class})
class ReportRateLimitIT extends PostgresTestBase {

    private RestTestClient rest;

    @LocalServerPort private int port;

    @Autowired private JdbcTemplate jdbc;

    @Autowired private MutableClock clock;

    @BeforeEach
    void setUp() {
        rest = RestTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
        clock.advance(Duration.ofDays(1));
    }


    @Test
    void theSixthReportFromOneCallerWithinTheHourIsRefused() {
        String caller = anIpAddress();
        for (int accepted = 0; accepted < ReportRateLimiter.PER_IP_PER_HOUR; accepted++) {
            submit(UUID.randomUUID(), caller, null).expectStatus().isCreated();
        }

        UUID refused = UUID.randomUUID();
        submit(refused, caller, null).expectStatus().isEqualTo(429);

        assertThat(countOf(refused)).isZero();
    }


    @Test
    void aRefusalCarriesTheStandardErrorEnvelope() {
        String caller = anIpAddress();
        spendTheHourlyAllowance(caller);

        byte[] body =
                submit(UUID.randomUUID(), caller, null)
                        .expectStatus()
                        .isEqualTo(429)
                        .expectBody()
                        .returnResult()
                        .getResponseBodyContent();

        assertThat(new String(body)).contains("TOO_MANY_REPORTS").contains("traceId");
    }


    @Test
    void anotherCallerIsUnaffectedByTheFirstCallersRefusal() {
        String spent = anIpAddress();
        spendTheHourlyAllowance(spent);
        submit(UUID.randomUUID(), spent, null).expectStatus().isEqualTo(429);

        submit(UUID.randomUUID(), anIpAddress(), null).expectStatus().isCreated();
    }


    @Test
    void theAllowanceReturnsOnceTheHourHasPassed() {
        String caller = anIpAddress();
        spendTheHourlyAllowance(caller);
        submit(UUID.randomUUID(), caller, null).expectStatus().isEqualTo(429);

        clock.advance(Duration.ofHours(1).plusMinutes(1));

        submit(UUID.randomUUID(), caller, null).expectStatus().isCreated();
    }


    @Test
    void aRefusedReportIdIsAcceptedNormallyOnceTheWindowPasses() {
        String caller = anIpAddress();
        spendTheHourlyAllowance(caller);
        UUID refused = UUID.randomUUID();
        submit(refused, caller, null).expectStatus().isEqualTo(429);

        clock.advance(Duration.ofHours(1).plusMinutes(1));

        submit(refused, caller, null).expectStatus().isCreated();
        assertThat(countOf(refused)).isEqualTo(1);
    }


    @Test
    void aSignedInCallerObeysTheSameLimitAsAnAnonymousOne() {
        String caller = anIpAddress();
        String uid = "uid-" + UUID.randomUUID();
        String token = TestJwtSupport.verifiedToken(uid, uid + "@example.com");
        for (int accepted = 0; accepted < ReportRateLimiter.PER_IP_PER_HOUR; accepted++) {
            submit(UUID.randomUUID(), caller, token).expectStatus().isCreated();
        }

        submit(UUID.randomUUID(), caller, token).expectStatus().isEqualTo(429);
    }


    @Test
    void theGlobalCapRefusesEveryCallerRegardlessOfAddress() {
        int callersNeeded = ReportRateLimiter.GLOBAL_PER_DAY / ReportRateLimiter.PER_IP_PER_HOUR;
        for (int caller = 0; caller < callersNeeded; caller++) {
            spendTheHourlyAllowance(anIpAddress());
        }

        submit(UUID.randomUUID(), anIpAddress(), null).expectStatus().isEqualTo(429);
    }


    @Test
    void theLimitsScopeToTheReportsRouteOnly() {
        String caller = anIpAddress();
        spendTheHourlyAllowance(caller);
        submit(UUID.randomUUID(), caller, null).expectStatus().isEqualTo(429);

        rest.get()
                .uri("/v1/health")
                .header(CALLER_HEADER, caller)
                .exchange()
                .expectStatus()
                .isOk();
    }


    @Test
    void theNearestForwardedHopIsTheCallerRatherThanAClientSuppliedOne() {
        String proxySawUs = anIpAddress();
        for (int accepted = 0; accepted < ReportRateLimiter.PER_IP_PER_HOUR; accepted++) {
            submit(UUID.randomUUID(), "203.0.113." + accepted + ", " + proxySawUs, null)
                    .expectStatus()
                    .isCreated();
        }

        submit(UUID.randomUUID(), "203.0.113.250, " + proxySawUs, null)
                .expectStatus()
                .isEqualTo(429);
    }


    private void spendTheHourlyAllowance(String caller) {
        for (int accepted = 0; accepted < ReportRateLimiter.PER_IP_PER_HOUR; accepted++) {
            submit(UUID.randomUUID(), caller, null).expectStatus().isCreated();
        }
    }


    private RestTestClient.ResponseSpec submit(UUID reportId, String caller, String token) {
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part(
                "report",
                "{\"reportId\":\"" + reportId + "\",\"type\":\"idea\",\"description\":\"Hello.\"}");

        var request =
                rest.post()
                        .uri(ReportPaths.ANONYMOUS)
                        .header(CALLER_HEADER, caller)
                        .contentType(MediaType.MULTIPART_FORM_DATA);
        if (token != null) {
            request = request.header(HttpHeaders.AUTHORIZATION, bearer(token));
        }
        return request.body(body.build()).exchange();
    }


    private int countOf(UUID reportId) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM report_outbox WHERE id = ?", Integer.class, reportId);
    }


    private static String anIpAddress() {
        int octet = NEXT_ADDRESS.incrementAndGet();
        return "198.51." + (octet / 250) + "." + (octet % 250);
    }


    private static final java.util.concurrent.atomic.AtomicInteger NEXT_ADDRESS =
            new java.util.concurrent.atomic.AtomicInteger();

    private static final String CALLER_HEADER = "X-Forwarded-For";


    @TestConfiguration
    static class SteppedClockConfig {

        @Bean
        @Primary
        MutableClock rateLimitTestClock() {
            return new MutableClock(Instant.parse("2026-08-28T09:00:00Z"));
        }
    }
}
