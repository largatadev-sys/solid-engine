package com.largata.diary;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;


interface DiaryRepository extends JpaRepository<Diary, UUID> {

    List<Diary> findByAuthorIdOrderById(UUID authorId, Limit limit);

    List<Diary> findByAuthorIdAndIdGreaterThanOrderById(UUID authorId, UUID after, Limit limit);

    Optional<Diary> findByIdAndAuthorId(UUID id, UUID authorId);

    Optional<Diary> findByAuthorIdAndTripId(UUID authorId, UUID tripId);
}
