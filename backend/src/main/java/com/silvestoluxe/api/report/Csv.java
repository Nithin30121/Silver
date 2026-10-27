package com.silvestoluxe.api.report;

import java.util.List;
import java.util.stream.Collectors;

/** Spreadsheet-safe CSV: every text cell is quoted, and cells a spreadsheet would run as a formula are defused. */
final class Csv {
    /** Lets Excel recognise UTF-8, so names with accents and the rupee sign survive. */
    static final String BYTE_ORDER_MARK = "﻿";

    private Csv() { }

    static String row(List<?> cells) {
        return cells.stream().map(Csv::cell).collect(Collectors.joining(",")) + "\r\n";
    }

    static String cell(Object value) {
        if (value == null) return "";
        // Numbers come from the database, not from people, so they stay numeric in the spreadsheet.
        if (value instanceof Number) return value.toString();
        String text = value.toString();
        // A customer could type "=HYPERLINK(...)" as their name; a leading quote makes spreadsheets show it as text.
        if (!text.isEmpty() && "=+-@\t\r".indexOf(text.charAt(0)) >= 0) text = "'" + text;
        return "\"" + text.replace("\"", "\"\"") + "\"";
    }
}
