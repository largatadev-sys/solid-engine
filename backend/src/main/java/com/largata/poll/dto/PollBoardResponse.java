package com.largata.poll.dto;

import com.largata.poll.service.PollBoard;
import java.util.List;


public record PollBoardResponse(
        List<PollResponse> active, List<PollResponse> completed, int memberCount) {

    public static PollBoardResponse of(PollBoard board) {
        return new PollBoardResponse(
                board.active().stream().map(PollResponse::of).toList(),
                board.completed().stream().map(PollResponse::of).toList(),
                board.memberCount());
    }
}
