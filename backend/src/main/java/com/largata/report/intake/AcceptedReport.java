package com.largata.report.intake;

import java.util.UUID;


public record AcceptedReport(UUID reportId, boolean firstAccept) {}
