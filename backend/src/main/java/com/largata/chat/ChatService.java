package com.largata.chat;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.api.Cursor;
import com.largata.common.api.Page;
import com.largata.common.authz.InAudience;
import com.largata.common.authz.Membership;
import com.largata.common.authz.PublicationState;
import com.largata.common.authz.WriteFence;
import com.largata.common.tx.AfterCommit;
import com.largata.identity.TravelerService;
import com.largata.identity.TravelerSummary;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class ChatService {

    private static final int DEFAULT_PAGE_SIZE = 30;

    private static final int MAX_PAGE_SIZE = 100;

    private final ChatMessageRepository messages;
    private final TravelerService travelers;
    private final WriteFence writeFence;
    private final PublicationState publication;
    private final ChatTopic topic;
    private final Analytics analytics;
    private final Clock clock;

    ChatService(
            ChatMessageRepository messages,
            TravelerService travelers,
            WriteFence writeFence,
            PublicationState publication,
            ChatTopic topic,
            Analytics analytics,
            Clock clock) {
        this.messages = messages;
        this.travelers = travelers;
        this.writeFence = writeFence;
        this.publication = publication;
        this.topic = topic;
        this.analytics = analytics;
        this.clock = clock;
    }


    @Transactional
    public ChatMessageView send(Membership member, String body) {
        writeFence.requireWritable(member);
        if (publication.isPublished(member.itineraryId())) {
            throw new ChatExceptions.ChatClosedException();
        }
        ChatMessage appended =
                messages.save(
                        ChatMessage.appended(
                                member.itineraryId(), member.travelerId(), body, Instant.now(clock)));

        ChatMessageView view = viewOf(appended, authorsOf(List.of(appended)));
        topic.broadcastAppended(member.itineraryId(), view);
        emitSent(member, appended.id());
        return view;
    }


    @Transactional(readOnly = true)
    public Page<ChatMessageView> thread(InAudience audience, String cursor, Integer requestedLimit) {
        UUID itineraryId = audience.member().itineraryId();
        int limit = clamp(requestedLimit);
        Limit probe = Limit.of(limit + 1);
        List<ChatMessage> found =
                cursor == null
                        ? messages.findByItineraryIdOrderByIdDesc(itineraryId, probe)
                        : messages.findByItineraryIdAndIdLessThanOrderByIdDesc(
                                itineraryId, Cursor.decode(cursor), probe);

        boolean exhausted = found.size() <= limit;
        List<ChatMessage> page = exhausted ? found : found.subList(0, limit);
        Map<UUID, TravelerSummary> authors = authorsOf(page);
        List<ChatMessageView> views = page.stream().map(message -> viewOf(message, authors)).toList();

        return exhausted ? Page.exhausted(views) : Page.of(views, Cursor.encode(page.getLast().id()));
    }


    private Map<UUID, TravelerSummary> authorsOf(List<ChatMessage> page) {
        List<UUID> ids = page.stream().map(ChatMessage::authorTravelerId).distinct().toList();
        return travelers.summariesByIds(ids).stream()
                .collect(Collectors.toMap(TravelerSummary::id, Function.identity()));
    }


    private static ChatMessageView viewOf(ChatMessage message, Map<UUID, TravelerSummary> authors) {
        return new ChatMessageView(
                message.id(),
                authors.get(message.authorTravelerId()),
                message.body(),
                message.at());
    }


    private void emitSent(Membership member, UUID messageId) {
        AfterCommit.run(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named("chat_message_sent")
                                        .with("messageId", messageId)
                                        .with("itineraryId", member.itineraryId())
                                        .with("travelerId", member.travelerId())
                                        .build()));
    }


    private static int clamp(Integer requestedLimit) {
        if (requestedLimit == null || requestedLimit < 1) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(requestedLimit, MAX_PAGE_SIZE);
    }
}
