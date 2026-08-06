package com.largata.common.storage;

import com.largata.common.error.DependencyUnavailableException;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


final class UnconfiguredObjectStore implements ObjectStore {

    private static final Logger log = LoggerFactory.getLogger(UnconfiguredObjectStore.class);

    @Override
    public void put(String key, byte[] bytes, String contentType) {
        throw refuse();
    }


    @Override
    public Optional<StoredObject> get(String key) {
        throw refuse();
    }


    @Override
    public void delete(String key) {
        throw refuse();
    }


    private DependencyUnavailableException refuse() {
        log.error(
                "Object storage is unreachable on this rung: largata.storage.endpoint is unset, so no "
                        + "bucket is configured to hold or serve media");
        return new DependencyUnavailableException("Photos are unavailable right now. Try again shortly.");
    }
}
