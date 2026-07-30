package com.largata.common.mail;


public record OutboundEmail(String to, String subject, String html) {}
