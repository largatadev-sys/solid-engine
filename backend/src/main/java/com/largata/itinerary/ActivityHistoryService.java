package com.largata.itinerary;

import com.largata.common.authz.Membership;
import java.time.Clock;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@Service
public class ActivityHistoryService {

    private final ActivityHistoryRepository entries;
    private final Clock clock;

    ActivityHistoryService(ActivityHistoryRepository entries, Clock clock) {
        this.entries = entries;
        this.clock = clock;
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public void record(Membership actor, HistoryAct act, LeaseSubject subject) {
        entries.save(
                ActivityHistoryEntry.of(
                        actor.itineraryId(), actor.travelerId(), act, subject, clock.instant()));
    }
}
