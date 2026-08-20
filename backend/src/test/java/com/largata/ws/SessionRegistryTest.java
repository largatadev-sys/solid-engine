package com.largata.ws;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class SessionRegistryTest {

    private static final UUID ITINERARY = UUID.randomUUID();
    private static final Topic CHAT = Topic.ofItinerary(ITINERARY, "chat");
    private static final Topic ECHO = Topic.parse(Topic.DEBUG_ECHO).orElseThrow();

    private final SessionRegistry registry = new SessionRegistry();

    @Test
    void aSubscribedSessionIsAmongTheTopicsSubscribers() {
        UUID traveler = UUID.randomUUID();
        Session session = detached(traveler);

        registry.register(session);
        registry.subscribe(session, CHAT);

        assertThat(registry.subscribersOf(CHAT)).containsExactly(session);
    }

    @Test
    void aTopicNobodyHoldsHasNoSubscribers() {
        assertThat(registry.subscribersOf(CHAT)).isEmpty();
    }

    @Test
    void unsubscribingRemovesTheSessionButKeepsItConnected() {
        Session session = detached(UUID.randomUUID());
        registry.register(session);
        registry.subscribe(session, CHAT);

        assertThat(registry.unsubscribe(session, CHAT)).isTrue();

        assertThat(registry.subscribersOf(CHAT)).isEmpty();
        assertThat(registry.sessionCount()).isEqualTo(1);
    }

    @Test
    void unsubscribingFromATopicNotHeldSaysSo() {
        Session session = detached(UUID.randomUUID());
        registry.register(session);

        assertThat(registry.unsubscribe(session, CHAT)).isFalse();
    }

    @Test
    void unregisteringDropsEverySubscriptionTheSessionHeld() {
        Session session = detached(UUID.randomUUID());
        registry.register(session);
        registry.subscribe(session, CHAT);
        registry.subscribe(session, ECHO);

        registry.unregister(session);

        assertThat(registry.subscribersOf(CHAT)).isEmpty();
        assertThat(registry.subscribersOf(ECHO)).isEmpty();
        assertThat(registry.sessionCount()).isZero();
    }

    @Test
    void twoSessionsOnOneTopicBothReceiveIt() {
        Session one = detached(UUID.randomUUID());
        Session two = detached(UUID.randomUUID());
        registry.register(one);
        registry.register(two);

        registry.subscribe(one, CHAT);
        registry.subscribe(two, CHAT);

        assertThat(registry.subscribersOf(CHAT)).containsExactlyInAnyOrder(one, two);
    }

    @Test
    void subscribingTwiceIsIdempotentRatherThanDoubleDelivering() {
        Session session = detached(UUID.randomUUID());
        registry.register(session);

        registry.subscribe(session, CHAT);
        registry.subscribe(session, CHAT);

        assertThat(registry.subscribersOf(CHAT)).containsExactly(session);
    }

    @Test
    void aTravelersSubscriptionsToAnItineraryAreFindableSoRemovalCanEvictThem() {
        UUID departing = UUID.randomUUID();
        UUID staying = UUID.randomUUID();
        Session theirPhone = detached(departing);
        Session theirLaptop = detached(departing);
        Session someoneElse = detached(staying);
        registry.register(theirPhone);
        registry.register(theirLaptop);
        registry.register(someoneElse);
        registry.subscribe(theirPhone, CHAT);
        registry.subscribe(theirLaptop, CHAT);
        registry.subscribe(someoneElse, CHAT);

        assertThat(registry.subscriptionsOf(departing, ITINERARY))
                .containsExactlyInAnyOrder(
                        new SessionRegistry.Held(theirPhone, CHAT), new SessionRegistry.Held(theirLaptop, CHAT));
    }

    @Test
    void evictionLeavesTheDepartingTravelersOtherTopicsAlone() {
        UUID departing = UUID.randomUUID();
        Session session = detached(departing);
        registry.register(session);
        registry.subscribe(session, CHAT);
        registry.subscribe(session, ECHO);

        assertThat(registry.subscriptionsOf(departing, ITINERARY))
                .containsExactly(new SessionRegistry.Held(session, CHAT));
    }

    @Test
    void aTopicEmptiedOfSubscribersIsForgottenRatherThanLeakingAnEntry() {
        Session session = detached(UUID.randomUUID());
        registry.register(session);
        registry.subscribe(session, CHAT);

        registry.unsubscribe(session, CHAT);

        assertThat(registry.topicCount()).isZero();
    }

    @Test
    void aRegisteredSessionIsFoundByItsSocketId() {
        Session session = detached(UUID.randomUUID());
        registry.register(session);

        assertThat(registry.find(session.id())).isSameAs(session);
    }

    @Test
    void anUnknownSocketIdFindsNothingRatherThanThrowing() {
        assertThat(registry.find("never-registered")).isNull();
    }

    private static Session detached(UUID travelerId) {
        return new Session(UUID.randomUUID().toString(), travelerId, null, 0);
    }
}
