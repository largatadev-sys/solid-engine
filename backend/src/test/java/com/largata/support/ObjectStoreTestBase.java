package com.largata.support;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;


public abstract class ObjectStoreTestBase extends PostgresTestBase {

    protected static final String BUCKET = "largata-media-it";

    protected static final GarageContainer STORAGE = new GarageContainer(BUCKET);

    static {
        STORAGE.start();
    }


    @DynamicPropertySource
    static void storage(DynamicPropertyRegistry registry) {
        registry.add("largata.storage.endpoint", STORAGE::getS3URL);
        registry.add("largata.storage.bucket", () -> BUCKET);
        registry.add("largata.storage.access-key", STORAGE::getUserName);
        registry.add("largata.storage.secret-key", STORAGE::getPassword);
        registry.add("largata.storage.region", () -> "us-east-1");
    }
}
