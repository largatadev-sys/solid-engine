package com.largata.report;

import java.util.UUID;


public record AcceptedReport(UUID reportId, boolean firstAccept) {}
