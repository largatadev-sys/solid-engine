package com.largata.report;

import com.largata.report.ReportExceptions.UnknownPlatformException;
import java.util.Locale;


public enum ReportPlatform {
    ANDROID,
    IOS,
    WEB;


    public static ReportPlatform parse(String wireName) {
        if (wireName == null || wireName.isBlank()) {
            throw new UnknownPlatformException();
        }
        try {
            return valueOf(wireName.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException unknown) {
            throw new UnknownPlatformException();
        }
    }


    public String wireName() {
        return name().toLowerCase(Locale.ROOT);
    }
}
