package com.largata.trip.editing.adapter;

import com.largata.common.authz.Membership;
import com.largata.common.authz.TripEditingSession;
import java.util.Optional;
import org.springframework.stereotype.Component;
import com.largata.trip.editing.service.EditLeaseService;


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
