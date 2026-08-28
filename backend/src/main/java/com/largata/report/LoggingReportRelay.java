package com.largata.report;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


public class LoggingReportRelay implements ReportRelay {

    private static final Logger log = LoggerFactory.getLogger(LoggingReportRelay.class);

    @Override
    public RelayOutcome relay(RelayEnvelope envelope) {
        log.info(
                "Report relayed (logging sink, no wire): reportId={} type={} screenshots={} reporter={}",
                envelope.reportId(),
                envelope.type(),
                envelope.screenshots().size(),
                envelope.reporter() == null ? null : envelope.reporter().travelerId());
        return RelayOutcome.delivered();
    }
}
