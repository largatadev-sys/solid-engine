package com.largata.common.mail;

import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;


public final class ResendMailTransport implements MailTransport {

    public static final String API_KEY_PRESENT = "!'${largata.resend.api-key:}'.isBlank()";

    private static final String SEND_URL = "https://api.resend.com/emails";

    private final RestClient http;
    private final String fromAddress;

    public ResendMailTransport(RestClient.Builder builder, String apiKey, String fromAddress) {
        this.http = builder.baseUrl(SEND_URL).defaultHeader("Authorization", "Bearer " + apiKey).build();
        this.fromAddress = fromAddress;
    }


    public static RestClient.Builder statedTransport() {
        return RestClient.builder().requestFactory(new JdkClientHttpRequestFactory());
    }

    @Override
    public void send(OutboundEmail email) {
        http.post()
                .contentType(MediaType.APPLICATION_JSON)
                .body(new ResendEmail(fromAddress, email.to(), email.subject(), email.html()))
                .retrieve()
                .toBodilessEntity();
    }


    public static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }


    private record ResendEmail(String from, String to, String subject, String html) {}
}
