package com.largata.join.card;

import java.util.ArrayList;
import java.util.List;
import java.util.function.ToIntFunction;
import java.util.regex.Pattern;


public final class TitleBlock {

    public static final float LARGE = 58f;

    public static final float SMALL = 46f;

    public static final float LARGE_LINE_HEIGHT = 1.12f;

    public static final float SMALL_LINE_HEIGHT = 1.15f;

    public static final int MAX_LINES = 3;

    private static final int STEP_DOWN_OVER = 30;

    private static final String ELLIPSIS = "…";

    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private TitleBlock() {}


    public static float sizeFor(String title) {
        return title.length() > STEP_DOWN_OVER ? SMALL : LARGE;
    }


    public static float lineHeightFor(String title) {
        return title.length() > STEP_DOWN_OVER ? SMALL_LINE_HEIGHT : LARGE_LINE_HEIGHT;
    }


    public static List<String> wrapClamp(String title, int columnWidth, ToIntFunction<String> widthOf) {
        List<String> lines = new ArrayList<>();
        StringBuilder current = new StringBuilder();

        for (String word : WHITESPACE.split(title.trim())) {
            if (word.isEmpty()) {
                continue;
            }
            String candidate = current.isEmpty() ? word : current + " " + word;
            if (current.isEmpty() || widthOf.applyAsInt(candidate) <= columnWidth) {
                current.setLength(0);
                current.append(candidate);
            } else {
                lines.add(current.toString());
                current.setLength(0);
                current.append(word);
            }
        }
        if (!current.isEmpty()) {
            lines.add(current.toString());
        }
        if (lines.size() <= MAX_LINES) {
            return lines;
        }
        return clamped(lines, columnWidth, widthOf);
    }


    private static List<String> clamped(
            List<String> lines, int columnWidth, ToIntFunction<String> widthOf) {
        String last = lines.get(MAX_LINES - 1);
        while (!last.isEmpty() && widthOf.applyAsInt(last + ELLIPSIS) > columnWidth) {
            last = last.substring(0, last.length() - 1).stripTrailing();
        }
        List<String> clamped = new ArrayList<>(lines.subList(0, MAX_LINES - 1));
        clamped.add(last + ELLIPSIS);
        return clamped;
    }
}
