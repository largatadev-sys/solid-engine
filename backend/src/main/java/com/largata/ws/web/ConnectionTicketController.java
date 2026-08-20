package com.largata.ws.web;

import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.ws.ConnectionTickets;
import com.largata.ws.api.ConnectionTicketResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/ws-ticket")
class ConnectionTicketController {

    private final ConnectionTickets tickets;

    ConnectionTicketController(ConnectionTickets tickets) {
        this.tickets = tickets;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ConnectionTicketResponse mint(@CurrentTraveler Traveler traveler) {
        return new ConnectionTicketResponse(tickets.mint(traveler.id()), ConnectionTickets.TTL.toSeconds());
    }
}
