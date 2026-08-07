package com.largata.support;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MinIOContainer;
import org.testcontainers.utility.DockerImageName;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;

import java.net.URI;


public abstract class ObjectStoreTestBase extends PostgresTestBase {

    protected static final String BUCKET = "largata-media-it";

    protected static final MinIOContainer STORAGE =
            new MinIOContainer(DockerImageName.parse("minio/minio:RELEASE.2025-09-07T16-13-09Z"));

    static {
        STORAGE.start();
        createBucket();
    }


    @DynamicPropertySource
    static void storage(DynamicPropertyRegistry registry) {
        registry.add("largata.storage.endpoint", STORAGE::getS3URL);
        registry.add("largata.storage.bucket", () -> BUCKET);
        registry.add("largata.storage.access-key", STORAGE::getUserName);
        registry.add("largata.storage.secret-key", STORAGE::getPassword);
        registry.add("largata.storage.region", () -> "us-east-1");
    }


    private static void createBucket() {
        try (S3Client s3 =
                S3Client.builder()
                        .endpointOverride(URI.create(STORAGE.getS3URL()))
                        .region(Region.US_EAST_1)
                        .forcePathStyle(true)
                        .credentialsProvider(
                                StaticCredentialsProvider.create(
                                        AwsBasicCredentials.create(STORAGE.getUserName(), STORAGE.getPassword())))
                        .build()) {
            s3.createBucket(CreateBucketRequest.builder().bucket(BUCKET).build());
        }
    }
}
