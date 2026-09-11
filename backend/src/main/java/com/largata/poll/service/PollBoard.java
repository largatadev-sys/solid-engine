package com.largata.poll.service;

import java.util.List;


public record PollBoard(List<PollView> active, List<PollView> completed, int memberCount) {}
