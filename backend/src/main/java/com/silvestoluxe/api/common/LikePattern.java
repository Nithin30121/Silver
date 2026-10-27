package com.silvestoluxe.api.common;

/** Builds "contains" patterns for SQL LIKE in which %, _ and \ typed by an admin are matched literally. */
public final class LikePattern {
    public static final char ESCAPE = '\\';

    private LikePattern() { }

    /** A search for "50%" matches the text "50%" rather than everything starting with 50. */
    public static String contains(String search) {
        return "%" + search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
    }
}
