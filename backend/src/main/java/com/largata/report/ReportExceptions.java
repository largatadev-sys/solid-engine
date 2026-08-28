package com.largata.report;

import com.largata.common.error.RateLimitedException;
import com.largata.common.error.ValidationException;


public final class ReportExceptions {

    private ReportExceptions() {}


    public static final class UnknownReportTypeException extends ValidationException {

        UnknownReportTypeException() {
            super("UNKNOWN_REPORT_TYPE", "A report is either a problem or an idea.");
        }
    }


    public static final class MissingDescriptionException extends ValidationException {

        MissingDescriptionException() {
            super("REPORT_DESCRIPTION_REQUIRED", "Tell us what happened before sending.");
        }
    }


    public static final class DescriptionTooLongException extends ValidationException {

        DescriptionTooLongException(int limit) {
            super(
                    "REPORT_DESCRIPTION_TOO_LONG",
                    "That description is too long. The limit is " + limit + " characters.");
        }
    }


    public static final class ScreenTooLongException extends ValidationException {

        ScreenTooLongException(int limit) {
            super("REPORT_SCREEN_TOO_LONG", "That screen name is too long. The limit is " + limit + " characters.");
        }
    }


    public static final class MalformedReportIdException extends ValidationException {

        MalformedReportIdException() {
            super("MALFORMED_REPORT_ID", "That report id is not valid.");
        }
    }


    public static final class TooManyScreenshotsException extends ValidationException {

        TooManyScreenshotsException(int limit) {
            super("TOO_MANY_SCREENSHOTS", "You can attach up to " + limit + " screenshots.");
        }
    }


    public static final class UnknownPlatformException extends ValidationException {

        UnknownPlatformException() {
            super("UNKNOWN_PLATFORM", "A report must say which platform it came from.");
        }
    }


    public static final class MissingAppVersionException extends ValidationException {

        MissingAppVersionException() {
            super("APP_VERSION_REQUIRED", "A report must carry the app version it came from.");
        }
    }


    public static final class TooManyReportsException extends RateLimitedException {

        TooManyReportsException() {
            super("TOO_MANY_REPORTS", "That is a lot of reports at once. Please try again a bit later.");
        }
    }
}
