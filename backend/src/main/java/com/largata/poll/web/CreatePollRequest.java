package com.largata.poll.web;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;


public record CreatePollRequest(
        @NotNull String question, @NotEmpty List<String> options, @NotNull Instant closesAt) {}
