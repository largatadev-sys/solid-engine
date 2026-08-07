package com.largata.common.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;


class S3ClientConfigurationTest {

    private HttpServer endpoint;
    private final List<RecordedRequest> received = new CopyOnWriteArrayList<>();


    @BeforeEach
    void startRecordingEndpoint() throws IOException {
        endpoint = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        endpoint.createContext("/", this::recordAndAccept);
        endpoint.start();
    }


    @AfterEach
    void stopRecordingEndpoint() {
        endpoint.stop(0);
    }


    @Test
    void noChecksumAlgorithmHeaderIsSentOnAPut() {
        store().put("photos/a.jpg", "bytes".getBytes(StandardCharsets.UTF_8), "image/jpeg");

        assertThat(received).hasSize(1);
        assertThat(received.getFirst().headerNames())
                .noneMatch(name -> name.equalsIgnoreCase("x-amz-checksum-algorithm"))
                .noneMatch(name -> name.equalsIgnoreCase("x-amz-sdk-checksum-algorithm"));
    }


    @Test
    void theBucketIsAddressedInThePathRatherThanTheHostname() {
        store().put("photos/a.jpg", "bytes".getBytes(StandardCharsets.UTF_8), "image/jpeg");

        assertThat(received.getFirst().path()).isEqualTo("/largata-media/photos/a.jpg");
    }


    @Test
    void aPutSurvivesAnEndpointThatRejectsUnknownChecksumHeaders() {
        assertThatCode(
                        () ->
                                store()
                                        .put(
                                                "photos/a.jpg",
                                                "bytes".getBytes(StandardCharsets.UTF_8),
                                                "image/jpeg"))
                .doesNotThrowAnyException();
    }


    private ObjectStore store() {
        return S3ObjectStore.create(
                new StorageSettings(
                        "http://127.0.0.1:" + endpoint.getAddress().getPort(),
                        "largata-media",
                        "key",
                        "secret",
                        "us-east-1"));
    }


    private void recordAndAccept(HttpExchange exchange) throws IOException {
        received.add(
                new RecordedRequest(
                        exchange.getRequestURI().getPath(),
                        exchange.getRequestHeaders().keySet().stream().toList()));
        exchange.getRequestBody().readAllBytes();
        exchange.sendResponseHeaders(200, -1);
        exchange.close();
    }


    private record RecordedRequest(String path, List<String> headerNames) {}
}
