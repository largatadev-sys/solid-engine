package com.largata.media;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;


interface PhotoRepository extends JpaRepository<Photo, UUID> {

    Optional<Photo> findBySubjectKindAndSubjectId(PhotoSubject subjectKind, UUID subjectId);

    List<Photo> findBySubjectKindAndSubjectIdOrderById(PhotoSubject subjectKind, UUID subjectId);

    List<Photo> findBySubjectKindAndSubjectIdInOrderById(PhotoSubject subjectKind, List<UUID> subjectIds);

    int countBySubjectKindAndSubjectId(PhotoSubject subjectKind, UUID subjectId);
}
