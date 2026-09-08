package com.largata.invitation.api;

import java.util.UUID;


public interface InvitationApi {

    void supersedePendingInvitationsFor(UUID workspaceId, UUID inviteeTravelerId);
}
