package com.largata.report;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;


public interface ReportOutboxRepository extends JpaRepository<ReportOutboxEntry, UUID> {

    List<ReportOutboxEntry> findByStatusAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAsc(
            ReportStatus status, Instant due, Limit limit);
}
