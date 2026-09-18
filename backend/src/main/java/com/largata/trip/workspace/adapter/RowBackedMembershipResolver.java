package com.largata.trip.workspace.adapter;

import com.largata.trip.api.Membership;
import com.largata.trip.api.MembershipResolver;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import com.largata.trip.workspace.repository.MembershipRepository;


@Component
class RowBackedMembershipResolver implements MembershipResolver {

    private final MembershipRepository memberships;

    RowBackedMembershipResolver(MembershipRepository memberships) {
        this.memberships = memberships;
    }

    @Override
    public Optional<Membership> resolve(UUID travelerId, UUID itineraryId) {
        return memberships
                .findRole(travelerId, itineraryId)
                .map(role -> new Membership(travelerId, itineraryId, role));
    }
}
