package com.largata.common.mail;


public interface MailTransport {

    void send(OutboundEmail email);
}
