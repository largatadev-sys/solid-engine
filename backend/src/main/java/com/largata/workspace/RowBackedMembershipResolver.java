package com.largata.workspace;

import com.largata.common.authz.Membership;
import com.largata.common.authz.MembershipResolver;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;


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
