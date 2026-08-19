package com.largata.poll.web;

import com.largata.poll.PollBoard;
import java.util.List;


public record PollBoardResponse(
        List<PollResponse> active, List<PollResponse> completed, int memberCount) {

    static PollBoardResponse of(PollBoard board) {
        return new PollBoardResponse(
                board.active().stream().map(PollResponse::of).toList(),
                board.completed().stream().map(PollResponse::of).toList(),
                board.memberCount());
    }
}
