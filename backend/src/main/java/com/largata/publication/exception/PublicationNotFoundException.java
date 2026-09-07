package com.largata.publication.exception;

import com.largata.common.error.NotFoundException;

public final class PublicationNotFoundException extends NotFoundException {

    public PublicationNotFoundException() {
        super("PUBLICATION_NOT_FOUND", "No such published itinerary.");
    }
}
