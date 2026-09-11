package com.largata.join.join.adapter;

import com.largata.join.join.service.JoinService;
import com.largata.trip.api.MembershipArrived;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
class SupersedeOnMembershipArrival {

    private final JoinService join;

    SupersedeOnMembershipArrival(JoinService join) {
        this.join = join;
    }


    @EventListener
    void onMembershipArrived(MembershipArrived arrival) {
        join.supersedeOpenRequest(arrival.workspaceId(), arrival.travelerId());
    }
}
