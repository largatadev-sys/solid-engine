package com.largata.common.storage;

import java.io.InputStream;
import java.util.Optional;


public interface ObjectStore {

    void put(String key, byte[] bytes, String contentType);

    Optional<StoredObject> get(String key);

    void delete(String key);


    record StoredObject(InputStream bytes, String contentType, long byteSize) {}
}
