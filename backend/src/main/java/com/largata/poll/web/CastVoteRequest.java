package com.largata.poll.web;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;


public record CastVoteRequest(@NotNull UUID optionId) {}
