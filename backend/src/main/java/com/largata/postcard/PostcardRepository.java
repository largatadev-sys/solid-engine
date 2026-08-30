package com.largata.postcard;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;


interface PostcardRepository extends JpaRepository<Postcard, UUID> {

    Optional<Postcard> findByIdAndAuthorId(UUID id, UUID authorId);

    List<Postcard> findByDiaryId(UUID diaryId);

    boolean existsByAuthorIdAndActivityId(UUID authorId, UUID activityId);
}
