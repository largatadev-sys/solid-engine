package com.largata.media;

import java.util.UUID;


public interface PhotoAudience {

    PhotoSubject governs();

    boolean mayRead(UUID subjectId, UUID travelerId);
}
