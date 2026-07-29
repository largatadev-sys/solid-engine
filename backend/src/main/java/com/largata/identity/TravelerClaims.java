package com.largata.identity;


public record TravelerClaims(String firebaseUid, String email, String displayName) {


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
