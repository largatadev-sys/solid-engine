package com.largata.media;

import com.largata.common.api.Cursor;
import com.largata.common.api.Page;
import com.largata.common.storage.ObjectStore;
import com.largata.media.MediaExceptions.PhotoNotFoundException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
public class PhotoService {

    private static final Logger log = LoggerFactory.getLogger(PhotoService.class);

    private final PhotoRepository photos;
    private final ObjectStore store;
    private final ImageIngest ingest;
    private final Clock clock;

    PhotoService(PhotoRepository photos, ObjectStore store, ImageIngest ingest, Clock clock) {
        this.photos = photos;
        this.store = store;
        this.ingest = ingest;
        this.clock = clock;
    }


    @Transactional
    public Photo replaceSingle(PhotoSubject subject, UUID subjectId, byte[] uploaded, UUID uploadedBy) {
        photos.findBySubjectKindAndSubjectId(subject, subjectId).ifPresent(this::remove);
        return add(subject, subjectId, uploaded, uploadedBy);
    }


    @Transactional
    public Photo add(PhotoSubject subject, UUID subjectId, byte[] uploaded, UUID uploadedBy) {
        IngestedImage image = ingest.accept(uploaded, framingFor(subject));
        Photo photo = Photo.of(subject, subjectId, image, uploadedBy, Instant.now(clock));

        store.put(photo.storageKey(), image.display(), image.contentType());
        store.put(photo.thumbnailStorageKey(), image.thumbnail(), image.contentType());
        Photo saved = photos.saveAndFlush(photo);

        log.info(
                "Photo stored: id={} subject={} subjectId={} bytes={}",
                saved.id(),
                subject,
                subjectId,
                saved.byteSize());
        return saved;
    }


    @Transactional
    public void deleteSingle(PhotoSubject subject, UUID subjectId) {
        photos.findBySubjectKindAndSubjectId(subject, subjectId).ifPresent(this::remove);
    }


    @Transactional
    public void delete(UUID photoId) {
        remove(photos.findById(photoId).orElseThrow(PhotoNotFoundException::new));
    }


    @Transactional(readOnly = true)
    public Optional<Photo> find(UUID photoId) {
        return photos.findById(photoId);
    }


    @Transactional(readOnly = true)
    public List<Photo> allOf(PhotoSubject subject, UUID subjectId) {
        return photos.findBySubjectKindAndSubjectIdOrderById(subject, subjectId);
    }


    @Transactional(readOnly = true)
    public Page<Photo> pageOf(PhotoSubject subject, UUID subjectId, String cursor, int limit) {
        Limit probe = Limit.of(limit + 1);
        List<Photo> found =
                cursor == null
                        ? photos.findBySubjectKindAndSubjectIdOrderById(subject, subjectId, probe)
                        : photos.findBySubjectKindAndSubjectIdAndIdGreaterThanOrderById(
                                subject, subjectId, Cursor.decode(cursor), probe);

        if (found.size() <= limit) {
            return Page.exhausted(found);
        }
        List<Photo> page = found.subList(0, limit);
        return Page.of(page, Cursor.encode(page.getLast().id()));
    }


    @Transactional(readOnly = true)
    public Map<UUID, List<Photo>> allOfEach(PhotoSubject subject, List<UUID> subjectIds) {
        if (subjectIds.isEmpty()) {
            return Map.of();
        }
        return photos.findBySubjectKindAndSubjectIdInOrderById(subject, subjectIds).stream()
                .collect(Collectors.groupingBy(Photo::subjectId));
    }


    @Transactional(readOnly = true)
    public int countOf(PhotoSubject subject, UUID subjectId) {
        return photos.countBySubjectKindAndSubjectId(subject, subjectId);
    }


    public Optional<ObjectStore.StoredObject> bytesOf(Photo photo, Variant variant) {
        return store.get(variant == Variant.THUMBNAIL ? photo.thumbnailStorageKey() : photo.storageKey());
    }


    private static ImageIngest.Framing framingFor(PhotoSubject subject) {
        return subject == PhotoSubject.TRAVELER_AVATAR
                ? ImageIngest.Framing.SQUARE
                : ImageIngest.Framing.AS_UPLOADED;
    }


    private void remove(Photo photo) {
        photos.delete(photo);
        photos.flush();
        store.delete(photo.storageKey());
        store.delete(photo.thumbnailStorageKey());
        log.info("Photo removed: id={} subject={}", photo.id(), photo.subjectKind());
    }


    public enum Variant {
        DISPLAY,
        THUMBNAIL
    }
}
