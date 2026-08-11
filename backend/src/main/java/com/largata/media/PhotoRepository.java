package com.largata.media;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;


interface PhotoRepository extends JpaRepository<Photo, UUID> {

    Optional<Photo> findBySubjectKindAndSubjectId(PhotoSubject subjectKind, UUID subjectId);

    List<Photo> findBySubjectKindAndSubjectIdOrderById(PhotoSubject subjectKind, UUID subjectId);

    List<Photo> findBySubjectKindAndSubjectIdOrderById(
            PhotoSubject subjectKind, UUID subjectId, Limit limit);

    List<Photo> findBySubjectKindAndSubjectIdAndIdGreaterThanOrderById(
            PhotoSubject subjectKind, UUID subjectId, UUID cursor, Limit limit);

    List<Photo> findBySubjectKindAndSubjectIdInOrderById(PhotoSubject subjectKind, List<UUID> subjectIds);

    int countBySubjectKindAndSubjectId(PhotoSubject subjectKind, UUID subjectId);
}
