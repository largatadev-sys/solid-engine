package com.largata.common.storage;


public record StorageSettings(
        String endpoint, String bucket, String accessKey, String secretKey, String region) {

    public static final String CONFIGURED = "!'${largata.storage.endpoint:}'.isBlank()";
}
