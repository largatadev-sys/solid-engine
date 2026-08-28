package com.largata.report;

import com.largata.report.ReportExceptions.UnknownReportTypeException;
import java.util.Locale;


public enum ReportType {
    PROBLEM,
    IDEA;


    public static ReportType parse(String wireName) {
        if (wireName == null || wireName.isBlank()) {
            throw new UnknownReportTypeException();
        }
        try {
            return valueOf(wireName.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException unknown) {
            throw new UnknownReportTypeException();
        }
    }


    public String wireName() {
        return name().toLowerCase(Locale.ROOT);
    }
}
