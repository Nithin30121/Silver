package com.silvestoluxe.api.report;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import java.util.Arrays;

import org.junit.jupiter.api.Test;

class CsvTest {

    @Test
    void quotesTextAndDoublesInnerQuotes() {
        assertEquals("\"Asha \"\"AR\"\" Rao\",\"12, Sample Street\"\r\n", Csv.row(Arrays.asList("Asha \"AR\" Rao", "12, Sample Street")));
    }

    @Test
    void keepsNumbersNumericAndBlanksEmpty() {
        assertEquals("3888.00,2,\r\n", Csv.row(Arrays.asList(new BigDecimal("3888.00"), 2, null)));
    }

    @Test
    void defusesCellsASpreadsheetWouldRunAsAFormula() {
        assertEquals("\"'=HYPERLINK(\"\"http://evil\"\")\"", Csv.cell("=HYPERLINK(\"http://evil\")"));
        assertEquals("\"'+91 90000 00001\"", Csv.cell("+91 90000 00001"));
        assertEquals("\"'@SUM(A1)\"", Csv.cell("@SUM(A1)"));
        assertEquals("\"Asha\"", Csv.cell("Asha"));
    }
}
