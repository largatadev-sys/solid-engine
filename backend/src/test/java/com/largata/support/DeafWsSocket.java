package com.largata.support;

import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.net.Socket;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

public final class DeafWsSocket implements AutoCloseable {

    private final Socket socket;

    private DeafWsSocket(Socket socket) {
        this.socket = socket;
    }


    public static DeafWsSocket handshakeThenStopReading(String wsUrl) {
        URI url = URI.create(wsUrl);
        try {
            Socket socket = new Socket(url.getHost(), url.getPort());
            socket.setTcpNoDelay(true);
            upgrade(socket, url);
            return new DeafWsSocket(socket);
        } catch (IOException unreachable) {
            throw new UncheckedIOException(unreachable);
        }
    }


    public void send(String frame) {
        try {
            socket.getOutputStream().write(maskedTextFrame(frame));
            socket.getOutputStream().flush();
        } catch (IOException unwritable) {
            throw new UncheckedIOException(unwritable);
        }
    }

    @Override
    public void close() {
        try {
            socket.close();
        } catch (IOException alreadyGone) {
            return;
        }
    }

    private static void upgrade(Socket socket, URI url) throws IOException {
        byte[] nonce = new byte[16];
        new SecureRandom().nextBytes(nonce);
        String request =
                "GET "
                        + url.getRawPath()
                        + (url.getRawQuery() == null ? "" : "?" + url.getRawQuery())
                        + " HTTP/1.1\r\nHost: "
                        + url.getHost()
                        + ":"
                        + url.getPort()
                        + "\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: "
                        + Base64.getEncoder().encodeToString(nonce)
                        + "\r\nSec-WebSocket-Version: 13\r\n\r\n";
        OutputStream out = socket.getOutputStream();
        out.write(request.getBytes(StandardCharsets.UTF_8));
        out.flush();
        readStatusLineAndHeaders(socket);
    }

    private static void readStatusLineAndHeaders(Socket socket) throws IOException {
        StringBuilder head = new StringBuilder();
        var in = socket.getInputStream();
        while (!head.toString().endsWith("\r\n\r\n")) {
            int next = in.read();
            if (next < 0) {
                throw new AssertionError("The server closed before completing the upgrade: " + head);
            }
            head.append((char) next);
        }
        String status = head.toString().lines().findFirst().orElse("");
        if (!status.contains("101")) {
            throw new AssertionError(
                    "The upgrade was refused, so this fixture would prove nothing about a stalled"
                            + " reader: "
                            + status);
        }
    }

    private static byte[] maskedTextFrame(String text) {
        byte[] payload = text.getBytes(StandardCharsets.UTF_8);
        if (payload.length > 125) {
            throw new IllegalArgumentException(
                    "This fixture writes only short control frames; it is a stalled READER, and a"
                            + " longer frame would need the extended length encoding.");
        }
        byte[] mask = new byte[4];
        new SecureRandom().nextBytes(mask);
        byte[] frame = new byte[6 + payload.length];
        frame[0] = (byte) 0x81;
        frame[1] = (byte) (0x80 | payload.length);
        System.arraycopy(mask, 0, frame, 2, 4);
        for (int i = 0; i < payload.length; i++) {
            frame[6 + i] = (byte) (payload[i] ^ mask[i % 4]);
        }
        return frame;
    }
}
