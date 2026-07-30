package com.largata.identity;


public record TravelerClaims(String firebaseUid, String email, String displayName, String photoUrl) {


    public static TravelerClaims of(String firebaseUid, String email, String name) {
        return of(firebaseUid, email, name, null);
    }


    public static TravelerClaims of(String firebaseUid, String email, String name, String picture) {
        return new TravelerClaims(firebaseUid, email, displayNameFrom(name, email), blankToNull(picture));
    }

    private static String displayNameFrom(String name, String email) {
        if (name != null && !name.isBlank()) {
            return name;
        }
        int at = email.indexOf('@');
        return at > 0 ? email.substring(0, at) : email;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
