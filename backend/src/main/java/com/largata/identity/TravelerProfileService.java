package com.largata.identity;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import com.largata.common.tx.AfterCommit;
import com.largata.identity.IdentityExceptions.HandleTakenException;
import com.largata.media.MediaUrls;
import com.largata.media.Photo;
import com.largata.media.PhotoService;
import com.largata.media.PhotoSubject;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class TravelerProfileService {

    public static final String EARN_GOAL = "earn";

    private static final Logger log = LoggerFactory.getLogger(TravelerProfileService.class);

    private final TravelerRepository travelers;
    private final FollowRequestService requests;
    private final PhotoService photos;
    private final Analytics analytics;
    private final Clock clock;

    TravelerProfileService(
            TravelerRepository travelers,
            FollowRequestService requests,
            PhotoService photos,
            Analytics analytics,
            Clock clock) {
        this.travelers = travelers;
        this.requests = requests;
        this.photos = photos;
        this.analytics = analytics;
        this.clock = clock;
    }


    @Transactional(readOnly = true)
    public Handle.Availability availability(String rawHandle, UUID askingFor) {
        Handle.Availability shape = Handle.check(rawHandle);
        if (shape != Handle.Availability.FREE) {
            return shape;
        }
        return isTakenByAnyoneElse(Handle.normalize(rawHandle), askingFor)
                ? Handle.Availability.TAKEN
                : Handle.Availability.FREE;
    }


    @Transactional(readOnly = true)
    public String suggestFor(Traveler traveler) {
        if (traveler.handle() != null) {
            return traveler.handle();
        }
        return HandleSuggestion.from(
                traveler.displayName(), traveler.email(), candidate -> travelers.countByHandle(candidate) > 0);
    }


    @Transactional
    public Traveler update(UUID travelerId, ProfileEdit edit) {
        Traveler traveler = travelers.findById(travelerId).orElseThrow();

        if (edit.handle() != null && !Handle.normalize(edit.handle()).equals(traveler.handle())) {
            claim(traveler, Handle.of(edit.handle()));
        }
        if (edit.displayName() != null && !edit.displayName().isBlank()) {
            traveler.rename(edit.displayName().strip());
        }
        if (edit.bio() != null) {
            traveler.describe(blankToNull(edit.bio()));
        }
        if (edit.avatarUrl() != null) {
            traveler.showPhoto(blankToNull(edit.avatarUrl()));
        }
        if (edit.goals() != null) {
            traveler.aimAt(edit.goals());
        }
        if (edit.interests() != null) {
            traveler.beCuriousAbout(edit.interests());
        }
        if (edit.country() != null || edit.preferredCurrency() != null || edit.homeCity() != null) {
            traveler.settleIn(
                    orKeep(edit.country(), traveler.country()),
                    orKeep(edit.preferredCurrency(), traveler.preferredCurrency()),
                    orKeep(blankToNull(edit.homeCity()), traveler.homeCity()));
        }

        boolean visibilityChanged = applyVisibility(traveler, edit.profileVisibility());

        Traveler saved = flush(traveler);
        log.info("Traveler profile updated: id={}", travelerId);
        emitPreferenceSignals(travelerId, edit);
        if (visibilityChanged) {
            emitVisibilityChange(travelerId, saved.profileVisibility());
        }
        return saved;
    }


    @Transactional
    public Traveler replaceAvatar(UUID travelerId, byte[] uploaded) {
        Traveler traveler = travelers.findById(travelerId).orElseThrow();
        Photo stored = photos.replaceSingle(PhotoSubject.TRAVELER_AVATAR, travelerId, uploaded, travelerId);
        traveler.showPhoto(MediaUrls.of(stored));
        Traveler saved = travelers.saveAndFlush(traveler);
        log.info("Traveler avatar uploaded: id={} photoId={}", travelerId, stored.id());
        return saved;
    }


    @Transactional
    public Traveler removeAvatar(UUID travelerId) {
        Traveler traveler = travelers.findById(travelerId).orElseThrow();
        photos.deleteSingle(PhotoSubject.TRAVELER_AVATAR, travelerId);
        traveler.showPhoto(null);
        Traveler saved = travelers.saveAndFlush(traveler);
        log.info("Traveler avatar removed: id={}", travelerId);
        return saved;
    }


    @Transactional
    public Traveler completeOnboarding(UUID travelerId) {
        Traveler traveler = travelers.findById(travelerId).orElseThrow();
        boolean firstTime = !traveler.onboardingCompleted();
        traveler.completeOnboarding(Instant.now(clock));
        Traveler saved = travelers.saveAndFlush(traveler);
        if (firstTime) {
            log.info("Onboarding completed: travelerId={}", travelerId);
            AfterCommit.run(
                    () -> analytics.emit(
                            AnalyticsEvent.named("onboarding_completed").with("travelerId", travelerId).build()));
        }
        return saved;
    }


    private boolean applyVisibility(Traveler traveler, ProfileVisibility wanted) {
        if (wanted == null || wanted == traveler.profileVisibility()) {
            return false;
        }
        traveler.showProfileTo(wanted);
        if (wanted.isOpenToEveryone()) {
            requests.approveEveryPendingFor(traveler.id());
        }
        return true;
    }


    private void emitVisibilityChange(UUID travelerId, ProfileVisibility now) {
        AfterCommit.run(
                () ->
                        analytics.emit(
                                AnalyticsEvent.named("profile_visibility_changed")
                                        .with("travelerId", travelerId)
                                        .with("visibility", now.wireName())
                                        .build()));
    }


    private void claim(Traveler traveler, Handle claimed) {
        if (isTakenByAnyoneElse(claimed.value(), traveler.id())) {
            throw new HandleTakenException();
        }
        traveler.claim(claimed);
    }


    private Traveler flush(Traveler traveler) {
        try {
            return travelers.saveAndFlush(traveler);
        } catch (DataIntegrityViolationException lostTheRaceForTheHandle) {
            throw new HandleTakenException();
        }
    }

    private boolean isTakenByAnyoneElse(String normalized, UUID askingFor) {
        return askingFor == null
                ? travelers.countByHandle(normalized) > 0
                : travelers.countByHandleOtherThan(normalized, askingFor) > 0;
    }


    private void emitPreferenceSignals(UUID travelerId, ProfileEdit edit) {
        List<String> goals = edit.goals();
        List<String> interests = edit.interests();

        AfterCommit.run(
                () -> {
                    if (goals != null && !goals.isEmpty()) {
                        analytics.emit(
                                AnalyticsEvent.named("onboarding_goals_selected")
                                        .with("travelerId", travelerId)
                                        .with("goals", goals)
                                        .build());
                        if (goals.contains(EARN_GOAL)) {
                            analytics.emit(
                                    AnalyticsEvent.named("earn_intent_signalled")
                                            .with("travelerId", travelerId)
                                            .build());
                        }
                    }
                    if (interests != null && !interests.isEmpty()) {
                        analytics.emit(
                                AnalyticsEvent.named("onboarding_interests_selected")
                                        .with("travelerId", travelerId)
                                        .with("interests", interests)
                                        .build());
                    }
                });
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    private static String orKeep(String incoming, String current) {
        return incoming == null ? current : incoming;
    }
}
