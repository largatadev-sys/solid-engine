package com.largata.join.card;

import java.util.regex.Pattern;


public final class DestinationInitials {

    private static final int MAX_INITIALS = 2;

    private static final Pattern SEPARATORS = Pattern.compile("[\\s._+\\-]+");

    private DestinationInitials() {}


    public static String of(String destination) {
        if (destination == null) {
            return "";
        }
        StringBuilder initials = new StringBuilder();
        for (String word : SEPARATORS.split(destination)) {
            String trimmed = word.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            int first = trimmed.codePointAt(0);
            if (!Character.isLetterOrDigit(first) || !isBasicLatin(first)) {
                continue;
            }
            initials.appendCodePoint(Character.toUpperCase(first));
            if (initials.length() == MAX_INITIALS) {
                break;
            }
        }
        return initials.toString();
    }


    private static boolean isBasicLatin(int codePoint) {
        return (codePoint >= 'a' && codePoint <= 'z')
                || (codePoint >= 'A' && codePoint <= 'Z')
                || (codePoint >= '0' && codePoint <= '9');
    }
}
