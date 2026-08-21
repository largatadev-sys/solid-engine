package com.largata.chat;

import com.largata.chat.api.ChatMessageResponse;
import com.largata.common.tx.AfterCommit;
import com.largata.ws.EventFanout;
import com.largata.ws.Topic;
import java.util.UUID;
import org.springframework.stereotype.Component;


@Component
public class ChatTopic {

    public static final String CHANNEL = "chat";

    public static final String EVENT_TYPE = "chat.message.appended";

    private final EventFanout fanout;

    ChatTopic(EventFanout fanout) {
        this.fanout = fanout;
    }


    void broadcastAppended(UUID itineraryId, ChatMessageView message) {
        ChatMessageResponse payload = ChatMessageResponse.of(message);
        AfterCommit.run(
                () -> fanout.broadcast(Topic.ofItinerary(itineraryId, CHANNEL), EVENT_TYPE, payload));
    }
}
