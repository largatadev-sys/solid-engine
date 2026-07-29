package com.largata.membership;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;


interface OwnershipTransferRepository extends JpaRepository<OwnershipTransfer, UUID> {

    List<OwnershipTransfer> findByWorkspaceIdOrderByTransferredAtAsc(UUID workspaceId);
}
