package com.largata.diary.repository;

import com.largata.diary.entity.DiaryDay;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DiaryDayRepository extends JpaRepository<DiaryDay, UUID> {

    List<DiaryDay> findByDiaryIdOrderByOrdinal(UUID diaryId);

    List<DiaryDay> findByDiaryIdInOrderByOrdinal(List<UUID> diaryIds);

    Optional<DiaryDay> findByIdAndDiaryId(UUID id, UUID diaryId);

    Optional<DiaryDay> findByDiaryIdAndDate(UUID diaryId, LocalDate date);

    Optional<DiaryDay> findByDiaryIdAndTripDayId(UUID diaryId, UUID tripDayId);
}
