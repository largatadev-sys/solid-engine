package com.largata.report;

import com.largata.report.ReportExceptions.MalformedReportIdException;
import java.util.UUID;


public final class ReportId {

    private ReportId() {}


    public static UUID parse(String minted) {
        if (minted == null || minted.isBlank()) {
            throw new MalformedReportIdException();
        }
        try {
            return UUID.fromString(minted.trim());
        } catch (IllegalArgumentException notAUuid) {
            throw new MalformedReportIdException();
        }
    }
}
