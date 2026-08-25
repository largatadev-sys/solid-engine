package com.largata.support;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.net.http.WebSocketHandshakeException;
import java.time.Duration;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;


public final class WsTestClient implements AutoCloseable {

    private static final Duration WAIT = Duration.ofSeconds(5);

    private final WebSocket socket;
    private final Sink sink;

    private WsTestClient(WebSocket socket, Sink sink) {
        this.socket = socket;
        this.sink = sink;
    }


    public static WsTestClient connect(String url, String origin) {
        Sink sink = new Sink();
        return new WsTestClient(open(url, origin, sink), sink);
    }


    public static int refusedStatus(String url, String origin) {
        try {
            open(url, origin, new Sink()).abort();
            return 101;
        } catch (CompletionException refused) {
            Throwable cause = refused.getCause() == null ? refused : refused.getCause();
            if (cause instanceof WebSocketHandshakeException handshake) {
                return handshake.getResponse().statusCode();
            }
            throw new AssertionError("The upgrade failed without a handshake response: " + cause, cause);
        }
    }


    public void send(String frame) {
        socket.sendText(frame, true).join();
    }


    public String awaitFrame() throws InterruptedException {
        String frame = sink.frames.poll(WAIT.toSeconds(), TimeUnit.SECONDS);
        if (frame == null) {
            throw new AssertionError(
                    "No frame arrived within "
                            + WAIT.toSeconds()
                            + "s. A connected-and-dead socket looks exactly like a connected one, so"
                            + " this wait is bounded rather than indefinite.");
        }
        return frame;
    }


    public String awaitFrameContaining(String needle) throws InterruptedException {
        java.util.List<String> seen = new java.util.ArrayList<>();
        long deadline = System.nanoTime() + WAIT.toNanos();
        while (System.nanoTime() < deadline) {
            String frame = sink.frames.poll(500, TimeUnit.MILLISECONDS);
            if (frame == null) {
                continue;
            }
            if (frame.contains(needle)) {
                return frame;
            }
            seen.add(frame);
        }
        throw new AssertionError(
                "No frame containing \""
                        + needle
                        + "\" arrived within "
                        + WAIT.toSeconds()
                        + "s. One act can raise several events, so a test that reads only the NEXT"
                        + " frame asserts an ordering nobody promised. Frames seen: "
                        + seen);
    }


    public boolean receivedNothingWithin(Duration window) throws InterruptedException {
        return sink.frames.poll(window.toMillis(), TimeUnit.MILLISECONDS) == null;
    }


    public Integer awaitClose() throws InterruptedException {
        for (int attempt = 0; attempt < 50; attempt++) {
            Integer code = sink.closeCode.get();
            if (code != null) {
                return code;
            }
            Thread.sleep(100);
        }
        return null;
    }

    @Override
    public void close() {
        socket.abort();
    }

    private static WebSocket open(String url, String origin, Sink sink) {
        WebSocket.Builder builder = HttpClient.newHttpClient().newWebSocketBuilder();
        if (origin != null) {
            builder = builder.header("Origin", origin);
        }
        return builder.buildAsync(URI.create(url), sink).join();
    }

    private static final class Sink implements WebSocket.Listener {

        private final BlockingQueue<String> frames = new LinkedBlockingQueue<>();
        private final AtomicReference<Integer> closeCode = new AtomicReference<>();
        private final StringBuilder partial = new StringBuilder();

        @Override
        public void onOpen(WebSocket webSocket) {
            webSocket.request(1);
        }

        @Override
        public CompletableFuture<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
            partial.append(data);
            if (last) {
                frames.add(partial.toString());
                partial.setLength(0);
            }
            webSocket.request(1);
            return null;
        }

        @Override
        public CompletableFuture<?> onClose(WebSocket webSocket, int statusCode, String reason) {
            closeCode.set(statusCode);
            return null;
        }

        @Override
        public void onError(WebSocket webSocket, Throwable error) {
            closeCode.compareAndSet(null, -1);
        }
    }
}
