package com.largata.common.id;

import java.util.UUID;
import org.hibernate.id.uuid.UuidVersion7Strategy;

/**
 * The one source of domain ids: UUIDv7, generated app-side (S0.1 spec).
 *
 * <p><strong>Why v7 and not {@link UUID#randomUUID()}.</strong> v4 is pure random, so consecutive
 * inserts scatter across the primary-key index and every insert dirties a different page. v7 puts a
 * millisecond timestamp in the high bits, so ids generated in sequence sort in sequence: inserts
 * land at the end of the index, and "recent first" reads (the shape of every feed and list in this
 * product) walk contiguous pages. The tail is still random — ids stay unguessable, which Artifact
 * 05 requires functionally, not stylistically: unlisted visibility is enforced by nothing but the
 * id being unguessable.
 *
 * <p><strong>Why app-side and not DB-side.</strong> The id exists before persistence, which module
 * boundaries rely on (a module hands another an id without a round-trip). Note what changed at S0.4
 * and did <em>not</em> change this: prod now runs Postgres 18, which ships a native {@code uuidv7()}
 * — the version hedge this javadoc used to cite is gone, and the decision stands on the boundary
 * argument alone. A DB-generated id would only be knowable after the insert, which is a different
 * (worse) shape, whatever the database can do.
 *
 * <p>The strategy is Hibernate's (7.4), already on the classpath. Deliberately not
 * {@code @UuidGenerator(style = TIME)} on the field: entities are constructed and handed their id
 * before they ever meet a session, so the id cannot come from a persistence-time hook.
 */
public final class UuidV7 {

    private UuidV7() {}

    public static UUID generate() {
        return UuidVersion7Strategy.INSTANCE.generateUuid(null);
    }
}
