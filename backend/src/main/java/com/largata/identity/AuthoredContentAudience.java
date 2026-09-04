package com.largata.identity;

import com.largata.identity.IdentityExceptions.ProfilePrivateException;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class AuthoredContentAudience {

    private final TravelerRepository travelers;
    private final FollowRepository follows;

    AuthoredContentAudience(TravelerRepository travelers, FollowRepository follows) {
        this.travelers = travelers;
        this.follows = follows;
    }


    @Transactional(readOnly = true)
    public boolean mayRead(UUID viewerId, UUID authorId) {
        if (viewerId.equals(authorId)) {
            return true;
        }
        if (travelers.countPrivate(authorId) == 0) {
            return true;
        }
        return follows.edgeCount(viewerId, authorId) > 0;
    }


    @Transactional(readOnly = true)
    public void requireReadable(UUID viewerId, UUID authorId) {
        if (!mayRead(viewerId, authorId)) {
            throw new ProfilePrivateException();
        }
    }


    @Transactional(readOnly = true)
    public Set<UUID> hiddenAmong(UUID viewerId, Collection<UUID> authorIds) {
        if (authorIds.isEmpty()) {
            return Set.of();
        }
        Set<UUID> hidden = new HashSet<>(travelers.privateAmong(authorIds));
        hidden.remove(viewerId);
        if (hidden.isEmpty()) {
            return Set.of();
        }
        hidden.removeAll(follows.followedAmong(viewerId, List.copyOf(hidden)));
        return hidden;
    }


    @Transactional(readOnly = true)
    public List<UUID> hiddenAuthorsFor(UUID viewerId) {
        List<UUID> allPrivate = travelers.allPrivateExcept(viewerId);
        if (allPrivate.isEmpty()) {
            return List.of();
        }
        Set<UUID> visible = Set.copyOf(follows.followedAmong(viewerId, allPrivate));
        return allPrivate.stream().filter(id -> !visible.contains(id)).toList();
    }
}
