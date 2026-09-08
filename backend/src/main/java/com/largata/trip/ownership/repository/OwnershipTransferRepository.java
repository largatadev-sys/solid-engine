package com.largata.trip.ownership.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.largata.trip.ownership.entity.OwnershipTransfer;


public interface OwnershipTransferRepository extends JpaRepository<OwnershipTransfer, UUID> {

    List<OwnershipTransfer> findByWorkspaceIdOrderByTransferredAtAsc(UUID workspaceId);


    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM OwnershipTransfer t WHERE t.workspaceId = :workspaceId")
    int deleteByWorkspaceId(@Param("workspaceId") UUID workspaceId);
}
