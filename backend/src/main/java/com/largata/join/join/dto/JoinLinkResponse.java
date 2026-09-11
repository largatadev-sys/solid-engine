package com.largata.join.join.dto;

import com.largata.join.join.service.JoinLinkView;


public record JoinLinkResponse(String token, String shareUrl) {

    public static JoinLinkResponse of(JoinLinkView link) {
        return new JoinLinkResponse(link.token(), link.shareUrl());
    }
}
