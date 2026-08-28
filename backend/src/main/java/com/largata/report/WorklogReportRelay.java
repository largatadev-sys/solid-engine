package com.largata.report;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.ObjectMapper;


public class WorklogReportRelay implements ReportRelay {

    public static final String INTAKE_CONFIGURED = "!'${largata.reports.intake-url:}'.isBlank()";

    public static final String INTAKE_UNCONFIGURED = "'${largata.reports.intake-url:}'.isBlank()";

    static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(10);
    static final Duration READ_TIMEOUT = Duration.ofSeconds(30);

    static final String SECRET_HEADER = "X-Intake-Secret";
    static final String REPORT_PART = "report";
    static final String REPORT_PART_FILENAME = "report.json";
    static final String SCREENSHOT_PART = "screenshot";

    private final RestClient http;
    private final ObjectMapper json;

    public WorklogReportRelay(
            RestClient.Builder builder, String intakeUrl, String intakeSecret, ObjectMapper json) {
        this.http = builder.baseUrl(intakeUrl).defaultHeader(SECRET_HEADER, intakeSecret).build();
        this.json = json;
    }


    public static RestClient.Builder statedTransport() {
        JdkClientHttpRequestFactory factory =
                new JdkClientHttpRequestFactory(
                        HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build());
        factory.setReadTimeout(READ_TIMEOUT);
        return RestClient.builder().requestFactory(factory);
    }


    @Override
    public RelayOutcome relay(RelayEnvelope envelope) {
        try {
            HttpStatusCode status =
                    http.post()
                            .contentType(MediaType.MULTIPART_FORM_DATA)
                            .body(bodyOf(envelope))
                            .exchange(
                                    (request, response) -> response.getStatusCode(),
                                    false);
            if (status.is2xxSuccessful()) {
                return RelayOutcome.delivered();
            }
            if (status.is4xxClientError() && !isTransient(status)) {
                return RelayOutcome.refused("worklog answered " + status.value());
            }
            return RelayOutcome.unreachable("worklog answered " + status.value());
        } catch (RestClientException unreachable) {
            return RelayOutcome.unreachable(unreachable.getClass().getSimpleName());
        }
    }


    private static boolean isTransient(HttpStatusCode status) {
        return status.value() == 408 || status.value() == 425 || status.value() == 429;
    }


    private MultiValueMap<String, org.springframework.http.HttpEntity<?>> bodyOf(RelayEnvelope envelope) {
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part(REPORT_PART, named(json.writeValueAsBytes(payloadOf(envelope)), REPORT_PART_FILENAME))
                .contentType(MediaType.APPLICATION_JSON);

        for (ReportScreenshot screenshot : envelope.screenshots()) {
            body.part(
                            SCREENSHOT_PART,
                            named(screenshot.bytes(), "screenshot-" + screenshot.ordinal() + ".jpg"))
                    .contentType(MediaType.parseMediaType(screenshot.contentType()));
        }
        return body.build();
    }


    private static Map<String, Object> payloadOf(RelayEnvelope envelope) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("reportId", envelope.reportId().toString());
        payload.put("type", envelope.type().wireName());
        payload.put("description", envelope.description());
        if (envelope.reporter() != null) {
            payload.put("reporter", reporterOf(envelope.reporter()));
        }
        payload.put("context", contextOf(envelope));
        payload.put("submittedAt", envelope.submittedAt().toString());
        return payload;
    }


    private static Map<String, Object> reporterOf(Reporter reporter) {
        Map<String, Object> fields = new LinkedHashMap<>();
        if (reporter.name() != null) {
            fields.put("name", reporter.name());
        }
        fields.put("uid", reporter.travelerId().toString());
        return fields;
    }


    private static Map<String, Object> contextOf(RelayEnvelope envelope) {
        Map<String, Object> context = new LinkedHashMap<>();
        context.put("platform", envelope.platform());
        context.put("appVersion", envelope.appVersion());
        if (envelope.screen() != null) {
            context.put("screen", envelope.screen());
        }
        return context;
    }


    private static ByteArrayResource named(byte[] bytes, String filename) {
        return new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        };
    }
}
