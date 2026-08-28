package com.largata.report.web;

import com.largata.report.AcceptedReport;
import com.largata.report.ReportId;
import com.largata.report.ReportPaths;
import com.largata.report.ReportRateLimiter;
import com.largata.report.ReportService;
import com.largata.report.ReportSubmission;
import com.largata.report.ReportType;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;


@RestController
@RequestMapping(ReportPaths.ANONYMOUS)
class ReportController {

    private final ReportService reports;
    private final OptionalReporter reporter;
    private final ReportRateLimiter limiter;
    private final ObjectMapper json;

    ReportController(
            ReportService reports,
            OptionalReporter reporter,
            ReportRateLimiter limiter,
            ObjectMapper json) {
        this.reports = reports;
        this.reporter = reporter;
        this.limiter = limiter;
        this.json = json;
    }


    @PostMapping
    ResponseEntity<SubmitReportResponse> submit(
            HttpServletRequest http,
            @RequestPart("report") String reportJson,
            @RequestPart(name = "screenshot", required = false) List<MultipartFile> screenshots)
            throws IOException {
        limiter.admit(CallerAddress.of(http));
        SubmitReportRequest request = json.readValue(reportJson, SubmitReportRequest.class);

        AcceptedReport accepted =
                reports.accept(
                        new ReportSubmission(
                                ReportId.parse(request.reportId()),
                                ReportType.parse(request.type()),
                                request.description(),
                                request.screen(),
                                request.appVersion(),
                                request.platform(),
                                reporter.fromVerifiedTokenOnly(),
                                bytesOf(screenshots)));

        return ResponseEntity.status(accepted.firstAccept() ? HttpStatus.CREATED : HttpStatus.OK)
                .body(new SubmitReportResponse(accepted.reportId()));
    }


    private static List<byte[]> bytesOf(List<MultipartFile> parts) throws IOException {
        if (parts == null) {
            return List.of();
        }
        List<byte[]> bytes = new ArrayList<>(parts.size());
        for (MultipartFile part : parts) {
            bytes.add(part.getBytes());
        }
        return bytes;
    }
}
