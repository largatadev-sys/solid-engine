package com.largata.report;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;


@Component
class ReportDeliveryPoller {

    private final ReportDeliveryService delivery;

    ReportDeliveryPoller(ReportDeliveryService delivery) {
        this.delivery = delivery;
    }


    @Scheduled(fixedRateString = "#{T(com.largata.report.ReportOutboxEntry).FIRST_BACKOFF.toMillis()}")
    void drainTheOutbox() {
        delivery.drainDueReports();
    }
}
