package com.largata.report;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;


@Component
class ReportDeliveryPoller {

    private final ReportDeliveryService delivery;

    ReportDeliveryPoller(ReportDeliveryService delivery) {
        this.delivery = delivery;
    }


    @Scheduled(
            fixedRateString = "${largata.reports.poll-interval-ms:60000}",
            initialDelayString = "${largata.reports.poll-initial-delay-ms:60000}")
    void drainTheOutbox() {
        delivery.drainDueReports();
    }
}
