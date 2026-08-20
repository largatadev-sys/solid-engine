package com.largata.ws;

import java.io.IOException;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.PingMessage;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;


public final class Session {

    public static final int SEND_QUEUE_LIMIT = 256;

    public static final int MISSED_PONGS_BEFORE_CLOSE = 2;

    static final CloseStatus SLOW_CONSUMER = new CloseStatus(4001, "SLOW_CONSUMER");

    static final CloseStatus UNRESPONSIVE = new CloseStatus(4002, "UNRESPONSIVE");

    private final String id;
    private final UUID travelerId;
    private final WebSocketSession socket;
    private final int queueLimit;
    private final Deque<String> pending = new ArrayDeque<>();
    private final AtomicInteger unansweredPings = new AtomicInteger();
    private boolean writing;
    private boolean overflowed;

    Session(String id, UUID travelerId, WebSocketSession socket, int queueLimit) {
        this.id = id;
        this.travelerId = travelerId;
        this.socket = socket;
        this.queueLimit = Math.max(queueLimit, 1);
    }

    public static Session over(WebSocketSession socket, UUID travelerId) {
        return new Session(socket.getId(), travelerId, socket, SEND_QUEUE_LIMIT);
    }


    public String id() {
        return id;
    }


    public UUID travelerId() {
        return travelerId;
    }


    public boolean send(String frame) {
        synchronized (pending) {
            if (overflowed) {
                return false;
            }
            if (pending.size() >= queueLimit) {
                overflowed = true;
                pending.clear();
                closeQuietly(SLOW_CONSUMER);
                return false;
            }
            pending.addLast(frame);
            if (writing) {
                return true;
            }
            writing = true;
        }
        drain();
        return true;
    }


    public boolean pingAndCheckLiveness() {
        if (unansweredPings.incrementAndGet() > MISSED_PONGS_BEFORE_CLOSE) {
            closeQuietly(UNRESPONSIVE);
            return false;
        }
        try {
            synchronized (socket) {
                socket.sendMessage(new PingMessage());
            }
            return true;
        } catch (IOException | IllegalStateException unreachable) {
            closeQuietly(UNRESPONSIVE);
            return false;
        }
    }


    public void pongReceived() {
        unansweredPings.set(0);
    }


    public void closeQuietly(CloseStatus status) {
        try {
            socket.close(status);
        } catch (IOException | IllegalStateException alreadyGone) {
            return;
        }
    }

    private void drain() {
        while (true) {
            String frame;
            synchronized (pending) {
                frame = pending.pollFirst();
                if (frame == null) {
                    writing = false;
                    return;
                }
            }
            try {
                synchronized (socket) {
                    socket.sendMessage(new TextMessage(frame));
                }
            } catch (IOException | IllegalStateException unwritable) {
                synchronized (pending) {
                    pending.clear();
                    writing = false;
                }
                closeQuietly(SLOW_CONSUMER);
                return;
            }
        }
    }
}
