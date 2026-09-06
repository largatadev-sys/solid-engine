package com.largata.postcard;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;


interface PostcardRepository extends JpaRepository<Postcard, UUID> {

    Optional<Postcard> findByIdAndAuthorId(UUID id, UUID authorId);

    List<Postcard> findByDiaryId(UUID diaryId);

    List<Postcard> findByDiaryDayId(UUID diaryDayId);

    List<Postcard> findByDiaryDayIdInOrderByCreatedAt(List<UUID> diaryDayIds);

    List<Postcard> findByAuthorIdAndDiaryIdIsNullOrderByCreatedAtDesc(UUID authorId);

    boolean existsByAuthorIdAndActivityId(UUID authorId, UUID activityId);

    int countByDiaryId(UUID diaryId);

    @Query(
            "SELECT p.diaryDayId AS dayId, count(p) AS total FROM Postcard p"
                    + " WHERE p.diaryDayId IN :dayIds GROUP BY p.diaryDayId")
    List<CountByHome> countsByDay(List<UUID> dayIds);

    @Query(
            "SELECT p.diaryId AS dayId, count(p) AS total FROM Postcard p"
                    + " WHERE p.diaryId IN :diaryIds GROUP BY p.diaryId")
    List<CountByHome> countsByDiary(List<UUID> diaryIds);


    interface CountByHome {

        UUID getDayId();

        long getTotal();


        default UUID dayId() {
            return getDayId();
        }


        default long total() {
            return getTotal();
        }
    }
}
