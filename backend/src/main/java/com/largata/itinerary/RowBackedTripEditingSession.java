package com.largata.itinerary;

import com.largata.common.authz.Membership;
import com.largata.common.authz.TripEditingSession;
import java.util.Optional;
import org.springframework.stereotype.Component;


@Component
class RowBackedTripEditingSession implements TripEditingSession {

    private final EditLeaseService leases;

    RowBackedTripEditingSession(EditLeaseService leases) {
        this.leases = leases;
    }

    @Override
    public Optional<String> heldByAnotherTraveler(Membership member) {
        return leases.foreignSessionHolderLabel(member);
    }
}
