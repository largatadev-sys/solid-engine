package com.largata.report;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;


public interface ReportScreenshotRepository extends JpaRepository<ReportScreenshot, UUID> {

    List<ReportScreenshot> findByReportIdOrderByOrdinal(UUID reportId);

    void deleteByReportId(UUID reportId);
}
