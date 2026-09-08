package com.largata.trip.editing.dto;

import com.largata.trip.editing.entity.LeaseSubject;
import com.largata.trip.editing.entity.LeaseSubjectType;
import java.util.UUID;
import com.largata.trip.validation.MissingLeaseSubjectIdException;


public record LeaseSubjectRequest(String subjectType, UUID subjectId) {


    public static LeaseSubject resolve(LeaseSubjectRequest request, UUID itineraryId) {
        if (request == null) {
            return LeaseSubject.header(itineraryId);
        }
        LeaseSubjectType type = LeaseSubjectType.fromWireName(request.subjectType());
        return switch (type) {
            case HEADER -> LeaseSubject.header(itineraryId);
            case SESSION -> LeaseSubject.session(itineraryId);
            case DAY -> new LeaseSubject(LeaseSubjectType.DAY, required(request.subjectId()));
            case ACTIVITY -> new LeaseSubject(LeaseSubjectType.ACTIVITY, required(request.subjectId()));
        };
    }


    private static UUID required(UUID subjectId) {
        if (subjectId == null) {
            throw new MissingLeaseSubjectIdException();
        }
        return subjectId;
    }
}
