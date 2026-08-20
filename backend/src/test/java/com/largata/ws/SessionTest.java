package com.largata.ws;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.URI;
import java.security.Principal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.PingMessage;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketExtension;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;

class SessionTest {

    private final RecordingSocket socket = new RecordingSocket();
    private final Session session = new Session("s1", UUID.randomUUID(), socket, 3);

    @Test
    void aSentFrameReachesTheSocket() {
        assertThat(session.send("hello")).isTrue();

        assertThat(socket.sent).containsExactly("hello");
    }

    @Test
    void framesArriveInTheOrderTheyWereSent() {
        IntStream.range(0, 3).forEach(i -> session.send("frame-" + i));

        assertThat(socket.sent).containsExactly("frame-0", "frame-1", "frame-2");
    }

    @Test
    void anUnansweredPingIsToleratedTwiceAndClosesOnTheThird() {
        assertThat(session.pingAndCheckLiveness()).isTrue();
        assertThat(session.pingAndCheckLiveness()).isTrue();

        assertThat(session.pingAndCheckLiveness()).isFalse();
        assertThat(socket.closedWith).isEqualTo(Session.UNRESPONSIVE);
    }

    @Test
    void aPongResetsTheMissedCountSoALiveConnectionIsNeverClosed() {
        IntStream.range(0, 20)
                .forEach(
                        i -> {
                            assertThat(session.pingAndCheckLiveness()).isTrue();
                            session.pongReceived();
                        });

        assertThat(socket.closedWith).isNull();
    }

    @Test
    void aSocketThatThrowsOnWriteClosesTheSessionRatherThanPropagating() {
        socket.failWrites = true;

        session.send("doomed");

        assertThat(socket.closedWith).isEqualTo(Session.SLOW_CONSUMER);
    }


    @Test
    void aConsumerThatCannotDrainIsClosedAtTheQueueLimitRatherThanBufferedForever() throws Exception {
        socket.holdWritesUntilReleased();
        Thread stuck = new Thread(() -> session.send("first"));
        stuck.start();
        socket.awaitWriterInside();

        IntStream.range(0, 3).forEach(i -> session.send("queued-" + i));

        assertThat(session.send("one-too-many")).isFalse();
        assertThat(socket.closedWith).isEqualTo(Session.SLOW_CONSUMER);
        socket.release();
        stuck.join();
    }

    @Test
    void aClosedSlowConsumerRefusesEverythingAfterwardsRatherThanReopening() throws Exception {
        socket.holdWritesUntilReleased();
        Thread stuck = new Thread(() -> session.send("first"));
        stuck.start();
        socket.awaitWriterInside();
        IntStream.range(0, 4).forEach(i -> session.send("queued-" + i));

        socket.release();
        stuck.join();

        assertThat(session.send("later")).isFalse();
    }

    private static final class RecordingSocket implements WebSocketSession {

        private final List<String> sent = new ArrayList<>();
        private boolean failWrites;
        private final CountDownLatch released = new CountDownLatch(1);
        private final CountDownLatch writerInside = new CountDownLatch(1);
        private volatile boolean holding;
        private CloseStatus closedWith;

        @Override
        public void sendMessage(WebSocketMessage<?> message) throws IOException {
            if (failWrites) {
                throw new IOException("socket gone");
            }
            if (message instanceof PingMessage) {
                return;
            }
            if (holding) {
                writerInside.countDown();
                try {
                    released.await();
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                }
            }
            sent.add(((TextMessage) message).getPayload());
        }

        private void holdWritesUntilReleased() {
            holding = true;
        }

        private void awaitWriterInside() throws InterruptedException {
            writerInside.await();
        }

        private void release() {
            holding = false;
            released.countDown();
        }

        @Override
        public void close(CloseStatus status) {
            closedWith = status;
        }

        @Override
        public String getId() {
            return "s1";
        }

        @Override
        public void close() {
            close(CloseStatus.NORMAL);
        }

        @Override
        public URI getUri() {
            return null;
        }

        @Override
        public HttpHeaders getHandshakeHeaders() {
            return HttpHeaders.EMPTY;
        }

        @Override
        public Map<String, Object> getAttributes() {
            return Map.of();
        }

        @Override
        public Principal getPrincipal() {
            return null;
        }

        @Override
        public java.net.InetSocketAddress getLocalAddress() {
            return null;
        }

        @Override
        public java.net.InetSocketAddress getRemoteAddress() {
            return null;
        }

        @Override
        public String getAcceptedProtocol() {
            return null;
        }

        @Override
        public void setTextMessageSizeLimit(int messageSizeLimit) {}

        @Override
        public int getTextMessageSizeLimit() {
            return 0;
        }

        @Override
        public void setBinaryMessageSizeLimit(int messageSizeLimit) {}

        @Override
        public int getBinaryMessageSizeLimit() {
            return 0;
        }

        @Override
        public List<WebSocketExtension> getExtensions() {
            return List.of();
        }

        @Override
        public boolean isOpen() {
            return closedWith == null;
        }
    }
}
