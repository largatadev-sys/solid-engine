package com.largata.identity;

/**
 * The facts a verified Firebase token carries about a traveler, in the domain's own terms.
 *
 * <p>The module's boundary type: callers hand over claims, not a {@code Jwt}, so nothing about
 * Spring Security's token representation leaks into the identity module (P6, ADR-002).
 *
 * @param firebaseUid the token's verified subject — the join to Firebase, and the only identifier
 * @param email snapshotted at provisioning; never re-synced (spec, decision 6d)
 * @param displayName a human label, non-unique, never a lookup key (02-domain-model)
 */
public record TravelerClaims(String firebaseUid, String email, String displayName) {

    /**
     * Derives the claims a Traveler is provisioned from.
     *
     * <p><strong>Display name: the {@code name} claim, else the email's local part</strong> (spec,
     * decision 6c). Google sign-ins carry a name; email sign-ups do not, and asking for one at
     * sign-up would need a forced token refresh to make it visible in claims — for a value nobody
     * can correct until a profile story exists. The fallback collides by construction
     * (ana@gmail.com and ana@yahoo.com both yield "ana"), which is exactly why display name is not
     * unique and not an identifier.
     *
     * @param name the {@code name} claim, or null when the token has none
     */
    public static TravelerClaims of(String firebaseUid, String email, String name) {
        return new TravelerClaims(firebaseUid, email, displayNameFrom(name, email));
    }

    private static String displayNameFrom(String name, String email) {
        if (name != null && !name.isBlank()) {
            return name;
        }
        int at = email.indexOf('@');
        return at > 0 ? email.substring(0, at) : email;
    }
}
