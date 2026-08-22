package com.largata.join.web;

import com.largata.join.JoinLinkView;


public record JoinLinkResponse(String token, String shareUrl) {

    static JoinLinkResponse of(JoinLinkView link) {
        return new JoinLinkResponse(link.token(), link.shareUrl());
    }
}
