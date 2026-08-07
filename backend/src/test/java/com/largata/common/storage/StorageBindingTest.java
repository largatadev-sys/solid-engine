package com.largata.common.storage;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;


class StorageBindingTest {

    private final ApplicationContextRunner contexts =
            new ApplicationContextRunner().withUserConfiguration(StorageConfig.class);


    @Test
    void anEndpointBindsTheRealStore() {
        contexts.withPropertyValues(
                        "largata.storage.endpoint=http://storage:3900",
                        "largata.storage.access-key=largata-local",
                        "largata.storage.secret-key=largata-local-dev")
                .run(context -> assertThat(context).getBean(ObjectStore.class).isInstanceOf(S3ObjectStore.class));
    }


    @Test
    void noEndpointRefusesRatherThanPretending() {
        contexts.run(
                context ->
                        assertThat(context)
                                .getBean(ObjectStore.class)
                                .isInstanceOf(UnconfiguredObjectStore.class));
    }


    @Test
    void aBlankEndpointRefusesToo() {
        contexts.withPropertyValues("largata.storage.endpoint=")
                .run(
                        context ->
                                assertThat(context)
                                        .getBean(ObjectStore.class)
                                        .isInstanceOf(UnconfiguredObjectStore.class));
    }
}
