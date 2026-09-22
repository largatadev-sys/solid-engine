package com.largata.trip.destruction;

import static com.largata.trip.room.Door.Rule.OPEN;

import com.largata.trip.room.CurrentMember;
import com.largata.trip.room.Door;
import com.largata.trip.room.Membership;
import com.largata.trip.room.Owner;
import com.largata.trip.exception.NotTheTripOwnerException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/trips")
class TripDestructionController {

    private final TripDestructionService trips;

    TripDestructionController(TripDestructionService trips) {
        this.trips = trips;
    }


    @DeleteMapping("/{tripId}")
    @Door(OPEN)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void destroy(@CurrentMember Membership member) {
        trips.destroy(Owner.of(member, NotTheTripOwnerException::toDeleteTheTrip));
    }
}
