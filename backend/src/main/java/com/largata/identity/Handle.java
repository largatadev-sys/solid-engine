package com.largata.identity;

import com.largata.identity.IdentityExceptions.HandleReservedException;
import com.largata.identity.IdentityExceptions.MalformedHandleException;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;


public record Handle(String value) {

    public static final int MIN_LENGTH = 2;
    public static final int MAX_LENGTH = 20;

    private static final Pattern SHAPE = Pattern.compile("[a-z0-9_]{" + MIN_LENGTH + "," + MAX_LENGTH + "}");

    private static final Set<String> RESERVED =
            Set.of(
                    "about", "account", "accounts", "admin", "administrator", "api", "app", "apps",
                    "auth", "billing", "blog", "contact", "dev", "discover", "docs", "explore",
                    "feed", "ftp", "help", "home", "itineraries", "itinerary", "largata", "legal",
                    "login", "logout", "mail", "me", "mod", "moderator", "new", "null", "official",
                    "privacy", "root", "search", "security", "settings", "signin", "signout",
                    "signup", "staff", "support", "system", "team", "terms", "test", "traveler",
                    "travelers", "trip", "trips", "undefined", "user", "users", "verify", "www",
                    "you");


    public static Handle of(String raw) {
        String normalized = normalize(raw);
        if (!SHAPE.matcher(normalized).matches()) {
            throw new MalformedHandleException();
        }
        if (RESERVED.contains(normalized)) {
            throw new HandleReservedException();
        }
        return new Handle(normalized);
    }


    public static Availability check(String raw) {
        String normalized = normalize(raw);
        if (!SHAPE.matcher(normalized).matches()) {
            return Availability.MALFORMED;
        }
        return RESERVED.contains(normalized) ? Availability.RESERVED : Availability.FREE;
    }


    public static String normalize(String raw) {
        return raw == null ? "" : raw.strip().toLowerCase(Locale.ROOT);
    }


    public enum Availability {
        FREE("FREE"),
        MALFORMED("MALFORMED"),
        RESERVED("RESERVED"),
        TAKEN("TAKEN");

        private final String wireName;

        Availability(String wireName) {
            this.wireName = wireName;
        }

        public String wireName() {
            return wireName;
        }
    }
}
