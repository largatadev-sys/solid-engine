package com.largata.diary.repository;

import com.largata.diary.entity.DiaryDay;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DiaryDayRepository extends JpaRepository<DiaryDay, UUID> {

    List<DiaryDay> findByDiaryIdOrderByOrdinal(UUID diaryId);

    List<DiaryDay> findByDiaryIdInOrderByOrdinal(List<UUID> diaryIds);

    Optional<DiaryDay> findByIdAndDiaryId(UUID id, UUID diaryId);

    Optional<DiaryDay> findByDiaryIdAndDate(UUID diaryId, LocalDate date);

    Optional<DiaryDay> findByDiaryIdAndTripDayId(UUID diaryId, UUID tripDayId);


    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(
            "UPDATE DiaryDay d SET d.ordinal = d.ordinal + :days"
                    + " WHERE d.diaryId = :diaryId AND d.tripDayId IS NULL")
    void shiftDatedOrdinals(@Param("diaryId") UUID diaryId, @Param("days") int days);
}
