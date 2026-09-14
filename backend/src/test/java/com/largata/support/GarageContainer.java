package com.largata.support;

import java.nio.file.Path;
import java.time.Duration;
import org.testcontainers.containers.BindMode;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;


public final class GarageContainer extends GenericContainer<GarageContainer> {

    public static final DockerImageName IMAGE = DockerImageName.parse("dxflrs/garage:v2.3.0");

    private static final int S3_PORT = 3900;

    private static final String ACCESS_KEY = "largata-test";

    private static final String SECRET_KEY = "largata-test-secret";

    private static final String RPC_SECRET = "0".repeat(63) + "1";

    private final String bucket;


    public GarageContainer(String bucket) {
        super(IMAGE);
        this.bucket = bucket;
        withCommand("/garage", "server", "--single-node", "--default-bucket");
        withEnv("GARAGE_DEFAULT_BUCKET", bucket);
        withEnv("GARAGE_DEFAULT_ACCESS_KEY", ACCESS_KEY);
        withEnv("GARAGE_DEFAULT_SECRET_KEY", SECRET_KEY);
        withEnv("GARAGE_RPC_SECRET", RPC_SECRET);
        withFileSystemBind(
                Path.of("..", "infra", "garage.toml").toAbsolutePath().normalize().toString(),
                "/etc/garage.toml",
                BindMode.READ_ONLY);
        withExposedPorts(S3_PORT);
        waitingFor(Wait.forLogMessage(".*S3 API server listening on.*", 1)
                .withStartupTimeout(Duration.ofSeconds(60)));
    }


    public String getS3URL() {
        return "http://" + getHost() + ":" + getMappedPort(S3_PORT);
    }


    public String getUserName() {
        return ACCESS_KEY;
    }


    public String getPassword() {
        return SECRET_KEY;
    }


    public String bucket() {
        return bucket;
    }
}
