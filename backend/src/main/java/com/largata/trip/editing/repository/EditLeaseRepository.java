package com.largata.trip.editing.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import com.largata.trip.editing.entity.EditLease;
import com.largata.trip.editing.entity.LeaseSubjectType;


public interface EditLeaseRepository extends JpaRepository<EditLease, UUID> {


    Optional<EditLease> findBySubjectTypeAndSubjectId(LeaseSubjectType subjectType, UUID subjectId);


    List<EditLease> findByItineraryId(UUID itineraryId);


    List<EditLease> findByItineraryIdIn(Collection<UUID> itineraryIds);


    List<EditLease> findByItineraryIdAndHolderId(UUID itineraryId, UUID holderId);


    List<EditLease> findBySubjectTypeAndSubjectIdIn(LeaseSubjectType subjectType, Collection<UUID> subjectIds);


    void deleteBySubjectTypeAndSubjectIdIn(LeaseSubjectType subjectType, Collection<UUID> subjectIds);
}
