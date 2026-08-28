package com.largata.report;

import com.largata.media.SanitizedImage;
import com.largata.media.SanitizedImageService;
import com.largata.report.ReportExceptions.DescriptionTooLongException;
import com.largata.report.ReportExceptions.MissingAppVersionException;
import com.largata.report.ReportExceptions.MissingDescriptionException;
import com.largata.report.ReportExceptions.ScreenTooLongException;
import com.largata.report.ReportExceptions.TooManyScreenshotsException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;


@Service
public class ReportService {

    public static final int MAX_DESCRIPTION_CHARS = 2000;
    public static final int MAX_SCREEN_CHARS = 200;
    public static final int MAX_SCREENSHOTS = 3;

    private static final Logger log = LoggerFactory.getLogger(ReportService.class);

    private final ReportOutboxRepository outbox;
    private final ReportInserter inserter;
    private final SanitizedImageService sanitizer;
    private final Clock clock;

    ReportService(
            ReportOutboxRepository outbox,
            ReportInserter inserter,
            SanitizedImageService sanitizer,
            Clock clock) {
        this.outbox = outbox;
        this.inserter = inserter;
        this.sanitizer = sanitizer;
        this.clock = clock;
    }


    public AcceptedReport accept(ReportSubmission submission) {
        String description = requireDescription(submission.description());
        String screen = boundedScreen(submission.screen());
        String platform = ReportPlatform.parse(submission.platform()).wireName();
        String appVersion = requireAppVersion(submission.appVersion());
        refuseTooManyScreenshots(submission.screenshots());

        if (outbox.existsById(submission.reportId())) {
            return replay(submission);
        }

        List<ReportScreenshot> attachments = sanitizeAll(submission);
        ReportOutboxEntry entry =
                ReportOutboxEntry.accept(
                        submission.reportId(),
                        submission.type(),
                        description,
                        screen,
                        appVersion,
                        platform,
                        submission.reporter(),
                        Instant.now(clock));

        try {
            inserter.insert(entry, attachments);
        } catch (DataIntegrityViolationException lostTheRace) {
            return replay(submission);
        }

        log.info(
                "Report accepted: reportId={} type={} screenshots={} reporter={}",
                entry.id(),
                entry.type(),
                attachments.size(),
                entry.reporterTravelerId());
        return new AcceptedReport(entry.id(), true);
    }


    private AcceptedReport replay(ReportSubmission submission) {
        log.info("Report replayed: reportId={}", submission.reportId());
        return new AcceptedReport(submission.reportId(), false);
    }


    private List<ReportScreenshot> sanitizeAll(ReportSubmission submission) {
        List<ReportScreenshot> attachments = new ArrayList<>(submission.screenshots().size());
        int ordinal = 0;
        for (byte[] uploaded : submission.screenshots()) {
            SanitizedImage sanitized = sanitizer.sanitizeForDisplay(uploaded);
            attachments.add(
                    ReportScreenshot.of(
                            submission.reportId(), ordinal++, sanitized.contentType(), sanitized.bytes()));
        }
        return attachments;
    }


    private static String requireDescription(String description) {
        if (description == null || description.isBlank()) {
            throw new MissingDescriptionException();
        }
        String trimmed = description.trim();
        if (trimmed.length() > MAX_DESCRIPTION_CHARS) {
            throw new DescriptionTooLongException(MAX_DESCRIPTION_CHARS);
        }
        return trimmed;
    }


    private static String requireAppVersion(String appVersion) {
        if (appVersion == null || appVersion.isBlank()) {
            throw new MissingAppVersionException();
        }
        return appVersion.trim();
    }


    private static String boundedScreen(String screen) {
        if (screen == null || screen.isBlank()) {
            return null;
        }
        if (screen.length() > MAX_SCREEN_CHARS) {
            throw new ScreenTooLongException(MAX_SCREEN_CHARS);
        }
        return screen;
    }


    private static void refuseTooManyScreenshots(List<byte[]> screenshots) {
        if (screenshots.size() > MAX_SCREENSHOTS) {
            throw new TooManyScreenshotsException(MAX_SCREENSHOTS);
        }
    }
}
