package com.largata.membership;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Ownership-transfer persistence. Package-private like every repository here (ADR-002).
 *
 * <p>Write-mostly by design — see {@link OwnershipTransfer} for why the table exists before anything
 * reads it. The one finder is the chain query, which the ITs use to prove a transfer was recorded and
 * which is the shape any future creator/audit reader will want: oldest first, so the first row's
 * {@code fromTravelerId} is the trip's creator.
 */
interface OwnershipTransferRepository extends JpaRepository<OwnershipTransfer, UUID> {

    List<OwnershipTransfer> findByWorkspaceIdOrderByTransferredAtAsc(UUID workspaceId);
}
