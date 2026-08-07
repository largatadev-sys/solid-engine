package com.largata.common.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;


@Configuration
public class StorageConfig {

    @Bean
    @ConditionalOnExpression(StorageSettings.CONFIGURED)
    ObjectStore s3ObjectStore(
            @Value("${largata.storage.endpoint}") String endpoint,
            @Value("${largata.storage.bucket:largata-media}") String bucket,
            @Value("${largata.storage.access-key}") String accessKey,
            @Value("${largata.storage.secret-key}") String secretKey,
            @Value("${largata.storage.region:us-east-1}") String region) {
        return S3ObjectStore.create(
                new StorageSettings(endpoint, bucket, accessKey, secretKey, region));
    }


    @Bean
    @ConditionalOnMissingBean(ObjectStore.class)
    ObjectStore unconfiguredObjectStore() {
        return new UnconfiguredObjectStore();
    }
}
