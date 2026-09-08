package com.largata.trip.workspace.service;

import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import com.largata.trip.workspace.repository.WorkspaceRepository;
import com.largata.trip.workspace.repository.MembershipRepository;
import com.largata.trip.workspace.entity.Workspace;


@Component
public class WorkspaceRows {

    private final WorkspaceRepository workspaces;
    private final MembershipRepository memberships;

    WorkspaceRows(WorkspaceRepository workspaces, MembershipRepository memberships) {
        this.workspaces = workspaces;
        this.memberships = memberships;
    }


    @Transactional(propagation = Propagation.MANDATORY, readOnly = true)
    public Optional<UUID> idOf(UUID tripId) {
        return workspaces.findByItineraryId(tripId).map(Workspace::id);
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public void deleteMembershipsOf(UUID workspaceId) {
        memberships.deleteByWorkspaceId(workspaceId);
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public void delete(UUID workspaceId) {
        workspaces.deleteById(workspaceId);
    }
}
