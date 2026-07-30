package com.largata.identity;

import com.largata.common.id.UuidV7;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;


@Entity
@Table(name = "traveler")
public class Traveler {

    @Id private UUID id;

    @Column(name = "firebase_uid", nullable = false, unique = true, updatable = false)
    private String firebaseUid;

    @Column(nullable = false)
    private String email;


    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column private String handle;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column private String bio;

    @Column private String country;

    @Column(name = "preferred_currency")
    private String preferredCurrency;

    @Column(name = "home_city")
    private String homeCity;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "text[]")
    private String[] goals;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "text[]")
    private String[] interests;

    @Column(name = "onboarding_completed_at")
    private Instant onboardingCompletedAt;

    protected Traveler() {
    }

    private Traveler(
            UUID id, String firebaseUid, String email, String displayName, String avatarUrl, Instant createdAt) {
        this.id = id;
        this.firebaseUid = firebaseUid;
        this.email = email;
        this.displayName = displayName;
        this.avatarUrl = avatarUrl;
        this.createdAt = createdAt;
    }


    static Traveler provision(
            String firebaseUid, String email, String displayName, String avatarUrl, Instant createdAt) {
        return new Traveler(UuidV7.generate(), firebaseUid, email, displayName, avatarUrl, createdAt);
    }

    public UUID id() {
        return id;
    }

    public String firebaseUid() {
        return firebaseUid;
    }

    public String email() {
        return email;
    }

    public String displayName() {
        return displayName;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public String handle() {
        return handle;
    }

    public String avatarUrl() {
        return avatarUrl;
    }

    public String bio() {
        return bio;
    }

    public String country() {
        return country;
    }

    public String preferredCurrency() {
        return preferredCurrency;
    }

    public String homeCity() {
        return homeCity;
    }

    public List<String> goals() {
        return goals == null ? List.of() : List.of(goals);
    }

    public List<String> interests() {
        return interests == null ? List.of() : List.of(interests);
    }

    public Instant onboardingCompletedAt() {
        return onboardingCompletedAt;
    }

    public boolean onboardingCompleted() {
        return onboardingCompletedAt != null;
    }


    void claim(Handle claimed) {
        this.handle = claimed.value();
    }

    void rename(String newDisplayName) {
        this.displayName = newDisplayName;
    }

    void describe(String newBio) {
        this.bio = newBio;
    }

    void showPhoto(String url) {
        this.avatarUrl = url;
    }

    void aimAt(List<String> chosenGoals) {
        this.goals = chosenGoals.toArray(String[]::new);
    }

    void beCuriousAbout(List<String> chosenInterests) {
        this.interests = chosenInterests.toArray(String[]::new);
    }

    void settleIn(String isoCountry, String isoCurrency, String city) {
        this.country = isoCountry;
        this.preferredCurrency = isoCurrency;
        this.homeCity = city;
    }


    void completeOnboarding(Instant at) {
        if (onboardingCompletedAt == null) {
            this.onboardingCompletedAt = at;
        }
    }
}
