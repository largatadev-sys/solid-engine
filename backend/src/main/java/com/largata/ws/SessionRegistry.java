package com.largata.ws;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.stereotype.Component;


@Component
public class SessionRegistry {

    private final Set<Session> sessions = ConcurrentHashMap.newKeySet();
    private final ConcurrentMap<Topic, Set<Session>> byTopic = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, Set<Topic>> bySession = new ConcurrentHashMap<>();


    public void register(Session session) {
        sessions.add(session);
        bySession.put(session.id(), ConcurrentHashMap.newKeySet());
    }


    public void subscribe(Session session, Topic topic) {
        byTopic.computeIfAbsent(topic, key -> ConcurrentHashMap.newKeySet()).add(session);
        bySession.computeIfAbsent(session.id(), key -> ConcurrentHashMap.newKeySet()).add(topic);
    }


    public boolean unsubscribe(Session session, Topic topic) {
        Set<Topic> held = bySession.get(session.id());
        if (held == null || !held.remove(topic)) {
            return false;
        }
        detach(session, topic);
        return true;
    }


    public void unregister(Session session) {
        sessions.remove(session);
        Set<Topic> held = bySession.remove(session.id());
        if (held == null) {
            return;
        }
        held.forEach(topic -> detach(session, topic));
    }


    public Set<Session> sessions() {
        return Set.copyOf(sessions);
    }


    public Session find(String sessionId) {
        return sessions.stream().filter(session -> session.id().equals(sessionId)).findFirst().orElse(null);
    }


    public Set<Session> subscribersOf(Topic topic) {
        return Set.copyOf(byTopic.getOrDefault(topic, Set.of()));
    }


    public List<Held> subscriptionsOf(UUID travelerId, UUID itineraryId) {
        return sessions.stream()
                .filter(session -> session.travelerId().equals(travelerId))
                .flatMap(
                        session ->
                                bySession.getOrDefault(session.id(), Set.of()).stream()
                                        .filter(topic -> topic.itineraryId().filter(itineraryId::equals).isPresent())
                                        .map(topic -> new Held(session, topic)))
                .toList();
    }


    public int sessionCount() {
        return sessions.size();
    }


    int topicCount() {
        return byTopic.size();
    }


    public int subscriptionTotal() {
        return byTopic.values().stream().mapToInt(Set::size).sum();
    }


    int subscriptionCount(Topic topic) {
        return byTopic.getOrDefault(topic, Set.of()).size();
    }

    private void detach(Session session, Topic topic) {
        byTopic.computeIfPresent(
                topic,
                (key, subscribers) -> {
                    subscribers.remove(session);
                    return subscribers.isEmpty() ? null : subscribers;
                });
    }


    public record Held(Session session, Topic topic) {}
}
