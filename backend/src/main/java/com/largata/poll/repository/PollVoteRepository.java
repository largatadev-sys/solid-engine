package com.largata.poll.repository;

import com.largata.poll.entity.PollVote;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PollVoteRepository extends JpaRepository<PollVote, UUID> {

    @Query("SELECT v FROM PollVote v WHERE v.pollId IN :pollIds ORDER BY v.castAt ASC, v.id ASC")
    List<PollVote> ofPolls(@Param("pollIds") Collection<UUID> pollIds);


    Optional<PollVote> findByPollIdAndWorkspaceIdAndTravelerId(UUID pollId, UUID workspaceId, UUID travelerId);
}
