package com.largata.itinerary;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;


interface EditLeaseRepository extends JpaRepository<EditLease, UUID> {


    Optional<EditLease> findBySubjectTypeAndSubjectId(LeaseSubjectType subjectType, UUID subjectId);


    List<EditLease> findByItineraryId(UUID itineraryId);


    List<EditLease> findByItineraryIdAndHolderId(UUID itineraryId, UUID holderId);


    List<EditLease> findBySubjectTypeAndSubjectIdIn(LeaseSubjectType subjectType, Collection<UUID> subjectIds);


    void deleteBySubjectTypeAndSubjectIdIn(LeaseSubjectType subjectType, Collection<UUID> subjectIds);
}
