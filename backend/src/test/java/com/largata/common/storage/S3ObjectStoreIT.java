package com.largata.common.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import java.nio.charset.StandardCharsets;
import java.util.Optional;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.MinIOContainer;
import org.testcontainers.utility.DockerImageName;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;


class S3ObjectStoreIT {

    private static final DockerImageName EMULATOR =
            DockerImageName.parse("minio/minio:RELEASE.2025-09-07T16-13-09Z");

    private static final String BUCKET = "largata-media-test";

    private static MinIOContainer emulator;
    private static ObjectStore store;


    @BeforeAll
    static void startEmulator() {
        emulator = new MinIOContainer(EMULATOR);
        emulator.start();
        StorageSettings settings =
                new StorageSettings(
                        emulator.getS3URL(),
                        BUCKET,
                        emulator.getUserName(),
                        emulator.getPassword(),
                        "us-east-1");
        S3ObjectStore.client(settings)
                .createBucket(CreateBucketRequest.builder().bucket(BUCKET).build());
        store = S3ObjectStore.create(settings);
    }


    @AfterAll
    static void stopEmulator() {
        if (emulator != null) {
            emulator.stop();
        }
    }


    @Test
    void bytesPutUnderAKeyComeBackUnchanged() {
        byte[] written = "the-photo-bytes".getBytes(StandardCharsets.UTF_8);

        store.put("photos/round-trip.jpg", written, "image/jpeg");

        StoredObjectContent read = read("photos/round-trip.jpg");
        assertThat(read.bytes()).isEqualTo(written);
        assertThat(read.contentType()).isEqualTo("image/jpeg");
        assertThat(read.byteSize()).isEqualTo(written.length);
    }


    @Test
    void anAbsentKeyIsEmptyRatherThanAnError() {
        assertThat(store.get("photos/never-written.jpg")).isEmpty();
    }


    @Test
    void aDeletedKeyIsGoneAndDeletingAgainIsSilent() {
        store.put("photos/transient.jpg", "x".getBytes(StandardCharsets.UTF_8), "image/jpeg");

        store.delete("photos/transient.jpg");

        assertThat(store.get("photos/transient.jpg")).isEmpty();
        assertThatCode(() -> store.delete("photos/transient.jpg")).doesNotThrowAnyException();
    }


    @Test
    void puttingTheSameKeyTwiceReplacesTheBytes() {
        store.put("photos/replaced.jpg", "first".getBytes(StandardCharsets.UTF_8), "image/jpeg");
        store.put("photos/replaced.jpg", "second".getBytes(StandardCharsets.UTF_8), "image/jpeg");

        assertThat(read("photos/replaced.jpg").bytes())
                .isEqualTo("second".getBytes(StandardCharsets.UTF_8));
    }


    private StoredObjectContent read(String key) {
        Optional<ObjectStore.StoredObject> found = store.get(key);
        assertThat(found).isPresent();
        ObjectStore.StoredObject object = found.orElseThrow();
        try (var bytes = object.bytes()) {
            return new StoredObjectContent(
                    bytes.readAllBytes(), object.contentType(), object.byteSize());
        } catch (Exception e) {
            throw new AssertionError("reading " + key + " failed", e);
        }
    }


    private record StoredObjectContent(byte[] bytes, String contentType, long byteSize) {}
}
