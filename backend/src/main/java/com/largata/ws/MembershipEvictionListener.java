package com.largata.ws;

import com.largata.membership.MembershipEnded;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.socket.CloseStatus;


@Component
public class MembershipEvictionListener {

    static final CloseStatus NO_LONGER_A_MEMBER = new CloseStatus(4003, "NO_LONGER_A_MEMBER");

    private static final Logger log = LoggerFactory.getLogger(MembershipEvictionListener.class);

    private final SessionRegistry registry;

    MembershipEvictionListener(SessionRegistry registry) {
        this.registry = registry;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void evictDepartedMember(MembershipEnded ended) {
        var held = registry.subscriptionsOf(ended.travelerId(), ended.itineraryId());
        held.forEach(subscription -> registry.unsubscribe(subscription.session(), subscription.topic()));
        if (!held.isEmpty()) {
            log.info(
                    "WS subscriptions evicted: itineraryId={} travelerId={} subscriptions={}",
                    ended.itineraryId(),
                    ended.travelerId(),
                    held.size());
        }
    }
}
