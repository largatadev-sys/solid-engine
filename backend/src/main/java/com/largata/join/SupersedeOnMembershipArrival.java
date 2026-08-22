package com.largata.join;

import com.largata.invitation.MembershipArrived;
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
