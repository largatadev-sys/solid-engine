package com.largata.poll;

import java.util.List;


public record PollBoard(List<PollView> active, List<PollView> completed, int memberCount) {}
