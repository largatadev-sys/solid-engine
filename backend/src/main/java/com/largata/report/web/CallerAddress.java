package com.largata.report.web;

import jakarta.servlet.http.HttpServletRequest;


final class CallerAddress {

    static final String FORWARDED_FOR = "X-Forwarded-For";

    private CallerAddress() {}


    static String of(HttpServletRequest request) {
        String forwarded = request.getHeader(FORWARDED_FOR);
        if (forwarded == null || forwarded.isBlank()) {
            return request.getRemoteAddr();
        }
        String[] hops = forwarded.split(",");
        String nearest = hops[hops.length - 1].trim();
        return nearest.isEmpty() ? request.getRemoteAddr() : nearest;
    }
}
