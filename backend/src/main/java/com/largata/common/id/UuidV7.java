package com.largata.common.id;

import java.util.UUID;
import org.hibernate.id.uuid.UuidVersion7Strategy;


public final class UuidV7 {

    private UuidV7() {}

    public static UUID generate() {
        return UuidVersion7Strategy.INSTANCE.generateUuid(null);
    }
}
