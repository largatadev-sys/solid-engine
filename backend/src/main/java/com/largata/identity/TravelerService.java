package com.largata.identity;

import com.largata.common.analytics.Analytics;
import com.largata.common.analytics.AnalyticsEvent;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class TravelerService {

    private static final Logger log = LoggerFactory.getLogger(TravelerService.class);

    private final TravelerRepository travelers;
    private final TravelerProvisioner provisioner;
    private final Analytics analytics;

    TravelerService(TravelerRepository travelers, TravelerProvisioner provisioner, Analytics analytics) {
        this.travelers = travelers;
        this.provisioner = provisioner;
        this.analytics = analytics;
    }


    public Traveler getOrProvision(TravelerClaims claims) {
        return travelers
                .findByFirebaseUid(claims.firebaseUid())
                .orElseGet(() -> insertOrReadWinner(claims));
    }

    private Traveler insertOrReadWinner(TravelerClaims claims) {
        try {
            Traveler provisioned = provisioner.insert(claims);
            log.info("Traveler provisioned: id={}", provisioned.id());
            analytics.emit(
                    AnalyticsEvent.named("traveler_signed_up").with("travelerId", provisioned.id()).build());
            return provisioned;
        } catch (DataIntegrityViolationException lostTheRace) {
            return travelers.findByFirebaseUid(claims.firebaseUid()).orElseThrow(() -> lostTheRace);
        }
    }


    @Transactional(readOnly = true)
    public List<UUID> travelerIdsWithEmail(String email) {
        return travelers.findIdsByEmail(email.toLowerCase(Locale.ROOT));
    }


    @Transactional(readOnly = true)
    public Optional<TravelerSummary> byExactHandle(String rawHandle) {
        String normalized = Handle.normalize(rawHandle);
        if (normalized.isEmpty()) {
            return Optional.empty();
        }
        return travelers
                .findByHandle(normalized)
                .map(t -> new TravelerSummary(t.id(), t.displayName(), t.handle(), t.avatarUrl()));
    }


    @Transactional(readOnly = true)
    public List<TravelerSummary> summariesByIds(Collection<UUID> ids) {
        return travelers.findAllById(ids).stream()
                .map(t -> new TravelerSummary(t.id(), t.displayName(), t.handle(), t.avatarUrl()))
                .toList();
    }
}
