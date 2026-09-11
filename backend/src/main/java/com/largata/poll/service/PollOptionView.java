package com.largata.poll.service;

import java.util.List;
import java.util.UUID;


public record PollOptionView(UUID id, String label, int voteCount, List<PollVoterSummary> voters) {}
