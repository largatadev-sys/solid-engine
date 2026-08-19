package com.largata.poll;

import java.util.List;
import java.util.UUID;


public record PollOptionView(UUID id, String label, int voteCount, List<PollVoterSummary> voters) {}
