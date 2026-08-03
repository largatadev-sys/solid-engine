package com.largata.workspace;

import com.largata.common.authz.Role;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;


@Service
public class WorkspaceService {

    private static final Logger log = LoggerFactory.getLogger(WorkspaceService.class);

    private final WorkspaceRepository workspaces;
    private final MembershipRepository memberships;

    @PersistenceContext private EntityManager entityManager;

    WorkspaceService(WorkspaceRepository workspaces, MembershipRepository memberships) {
        this.workspaces = workspaces;
        this.memberships = memberships;
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public void formAround(UUID itineraryId, UUID ownerTravelerId, Instant formedAt) {
        Workspace workspace = workspaces.save(Workspace.formAround(itineraryId, ownerTravelerId, formedAt));
        log.info(
                "Workspace formed: id={} itineraryId={} ownerId={}",
                workspace.id(),
                itineraryId,
                ownerTravelerId);
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public void admitMember(UUID itineraryId, UUID travelerId, Instant joinedAt) {
        Workspace workspace =
                workspaces
                        .findByItineraryId(itineraryId)
                        .orElseThrow(
                                () ->
                                        new IllegalStateException(
                                                "No workspace for itinerary " + itineraryId + " — invariant breach"));
        entityManager.persist(new Membership(workspace, travelerId, Role.MEMBER, joinedAt));
        entityManager.flush();
        log.info("Member admitted: itineraryId={} travelerId={}", itineraryId, travelerId);
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public void markCompleted(UUID itineraryId) {
        workspaces.findByItineraryId(itineraryId).ifPresent(Workspace::markCompleted);
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public void markActive(UUID itineraryId) {
        workspaces.findByItineraryId(itineraryId).ifPresent(Workspace::markActive);
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public void archive(UUID itineraryId) {
        workspaceFor(itineraryId).archive();
        log.info("Workspace archived: itineraryId={}", itineraryId);
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public void unarchive(UUID itineraryId, boolean itineraryIsCompleted) {
        workspaceFor(itineraryId).unarchive(itineraryIsCompleted);
        log.info("Workspace unarchived: itineraryId={} completed={}", itineraryId, itineraryIsCompleted);
    }


    private Workspace workspaceFor(UUID itineraryId) {
        return workspaces
                .findByItineraryId(itineraryId)
                .orElseThrow(() -> new IllegalStateException(
                        "No workspace for itinerary " + itineraryId + " — invariant breach"));
    }


    @Transactional(readOnly = true)
    public Optional<WorkspaceState> stateOf(UUID itineraryId) {
        return workspaces.findByItineraryId(itineraryId).map(Workspace::state);
    }


    @Transactional(readOnly = true)
    public boolean isArchived(UUID itineraryId) {
        return stateOf(itineraryId).map(WorkspaceState::isArchived).orElse(false);
    }


    @Transactional(readOnly = true)
    public boolean isMember(UUID itineraryId, UUID travelerId) {
        return memberships.findRole(travelerId, itineraryId).isPresent();
    }


    @Transactional(readOnly = true)
    public Optional<Role> roleOf(UUID itineraryId, UUID travelerId) {
        return memberships.findRole(travelerId, itineraryId);
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public boolean removeMember(UUID itineraryId, UUID travelerId) {
        if (memberships.findRole(travelerId, itineraryId).filter(role -> role == Role.OWNER).isPresent()) {
            throw new IllegalStateException(
                    "Refusing to destroy the owner's membership on itinerary "
                            + itineraryId
                            + " — INV-4; ownership transfers, it is never deleted");
        }
        return memberships.deleteMember(travelerId, itineraryId) > 0;
    }



    @Transactional(readOnly = true)
    public List<UUID> itineraryIdsFor(UUID travelerId, boolean archived) {
        return archived
                ? memberships.findOwnedItineraryIdsIn(travelerId, WorkspaceState.ARCHIVED)
                : memberships.findItineraryIdsNotIn(travelerId, WorkspaceState.ARCHIVED);
    }



    @Transactional(readOnly = true)
    public Optional<UUID> ownerOf(UUID itineraryId) {
        return memberships.findOwnerTravelerId(itineraryId);
    }


    @Transactional(propagation = Propagation.MANDATORY)
    public void transferOwnership(UUID itineraryId, UUID fromTravelerId, UUID toTravelerId) {
        if (fromTravelerId.equals(toTravelerId)) {
            throw new IllegalStateException(
                    "Ownership cannot transfer to its current holder on itinerary " + itineraryId);
        }
        int demoted = memberships.changeRole(fromTravelerId, itineraryId, Role.OWNER, Role.MEMBER);
        if (demoted != 1) {
            throw new IllegalStateException(
                    "Refusing to transfer ownership of itinerary "
                            + itineraryId
                            + " — traveler "
                            + fromTravelerId
                            + " no longer holds it (concurrent transfer?)");
        }
        int promoted = memberships.changeRole(toTravelerId, itineraryId, Role.MEMBER, Role.OWNER);
        if (promoted != 1) {
            throw new IllegalStateException(
                    "Refusing to leave itinerary "
                            + itineraryId
                            + " ownerless — traveler "
                            + toTravelerId
                            + " is no longer a member (concurrent departure?)");
        }
        log.info(
                "Ownership transferred: itineraryId={} from={} to={}", itineraryId, fromTravelerId, toTravelerId);
    }


    @Transactional(readOnly = true)
    public Optional<UUID> workspaceIdOf(UUID itineraryId) {
        return workspaces.findByItineraryId(itineraryId).map(Workspace::id);
    }


    @Transactional(readOnly = true)
    public List<MembershipView> membersOf(UUID itineraryId) {
        return memberships.findMembers(itineraryId);
    }


    @Transactional(readOnly = true)
    public Map<UUID, UUID> itineraryIdsByWorkspace(Collection<UUID> workspaceIds) {
        return workspaces.findAllById(workspaceIds).stream()
                .collect(Collectors.toMap(Workspace::id, Workspace::itineraryId));
    }
}
