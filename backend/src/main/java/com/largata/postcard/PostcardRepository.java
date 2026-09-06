package com.largata.postcard;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Limit;
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

    List<Postcard> findByAuthorIdAndTripIdOrderById(UUID authorId, UUID tripId, Limit limit);

    List<Postcard> findByAuthorIdAndTripIdAndIdGreaterThanOrderById(
            UUID authorId, UUID tripId, UUID after, Limit limit);

    List<Postcard> findByTripIdAndAuthorIdOrderById(UUID tripId, UUID authorId);

    @Query(
            "SELECT p.diaryDayId AS dayId, count(p) AS total FROM Postcard p"
                    + " WHERE p.diaryDayId IN :dayIds GROUP BY p.diaryDayId")
    List<CountByHome> countsByDay(List<UUID> dayIds);

    @Query(
            "SELECT p.diaryId AS dayId, count(p) AS total FROM Postcard p"
                    + " WHERE p.diaryId IN :diaryIds GROUP BY p.diaryId")
    List<CountByHome> countsByDiary(List<UUID> diaryIds);

    @Query(
            "SELECT p.tripId AS tripId, count(p) AS entryCount, max(p.id) AS latestEntryId"
                    + " FROM Postcard p WHERE p.authorId = :authorId AND p.tripId IN :onlyTrips"
                    + " GROUP BY p.tripId ORDER BY max(p.id) DESC")
    List<TripRollRow> rollsOfTrips(UUID authorId, Collection<UUID> onlyTrips, Limit limit);

    @Query(
            "SELECT p.tripId AS tripId, count(p) AS entryCount, max(p.id) AS latestEntryId"
                    + " FROM Postcard p WHERE p.authorId = :authorId AND p.tripId IN :onlyTrips"
                    + " GROUP BY p.tripId HAVING max(p.id) < :before ORDER BY max(p.id) DESC")
    List<TripRollRow> rollsOfTripsBefore(
            UUID authorId, Collection<UUID> onlyTrips, UUID before, Limit limit);

    @Query(
            "SELECT p.tripId AS tripId, count(p) AS entryCount, max(p.id) AS latestEntryId"
                    + " FROM Postcard p WHERE p.authorId = :authorId AND p.tripId IS NOT NULL"
                    + " GROUP BY p.tripId ORDER BY max(p.id) DESC")
    List<TripRollRow> rolls(UUID authorId, Limit limit);

    @Query(
            "SELECT p.tripId AS tripId, count(p) AS entryCount, max(p.id) AS latestEntryId"
                    + " FROM Postcard p WHERE p.authorId = :authorId AND p.tripId IS NOT NULL"
                    + " GROUP BY p.tripId HAVING max(p.id) < :before ORDER BY max(p.id) DESC")
    List<TripRollRow> rollsBefore(UUID authorId, UUID before, Limit limit);

    @Query("SELECT p FROM Postcard p ORDER BY p.createdAt DESC, p.id DESC")
    List<Postcard> firstFeedPage(Limit limit);

    @Query(
            "SELECT p FROM Postcard p WHERE p.authorId NOT IN :hiddenAuthorIds"
                    + " ORDER BY p.createdAt DESC, p.id DESC")
    List<Postcard> firstFeedPageExcept(Collection<UUID> hiddenAuthorIds, Limit limit);

    @Query(
            "SELECT p FROM Postcard p WHERE p.createdAt < :at"
                    + " OR (p.createdAt = :at AND p.id < :id)"
                    + " ORDER BY p.createdAt DESC, p.id DESC")
    List<Postcard> feedPageAfter(Instant at, UUID id, Limit limit);

    @Query(
            "SELECT p FROM Postcard p WHERE p.authorId NOT IN :hiddenAuthorIds"
                    + " AND (p.createdAt < :at OR (p.createdAt = :at AND p.id < :id))"
                    + " ORDER BY p.createdAt DESC, p.id DESC")
    List<Postcard> feedPageExceptAfter(
            Collection<UUID> hiddenAuthorIds, Instant at, UUID id, Limit limit);

    @Query(
            "SELECT p FROM Postcard p WHERE p.authorId IN :authorIds"
                    + " ORDER BY p.createdAt DESC, p.id DESC")
    List<Postcard> firstFeedPageBy(Collection<UUID> authorIds, Limit limit);

    @Query(
            "SELECT p FROM Postcard p WHERE p.authorId IN :authorIds"
                    + " AND (p.createdAt < :at OR (p.createdAt = :at AND p.id < :id))"
                    + " ORDER BY p.createdAt DESC, p.id DESC")
    List<Postcard> feedPageByAfter(
            Collection<UUID> authorIds, Instant at, UUID id, Limit limit);


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


    interface TripRollRow {

        UUID getTripId();

        long getEntryCount();

        UUID getLatestEntryId();
    }
}
