package com.largata.itinerary.web;

import com.largata.common.authz.AuthorizationGuard;
import com.largata.common.authz.Membership;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import com.largata.itinerary.DiaryService;
import com.largata.itinerary.api.AddDiaryPhotoFromDumpRequest;
import com.largata.itinerary.api.DiaryEntryResponse;
import com.largata.itinerary.api.PostDiaryEntryRequest;
import com.largata.itinerary.api.UpdateDiaryEntryRequest;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;


@RestController
@RequestMapping("/v1/itineraries/{itineraryId}/diary/entries")
class DiaryController {

    private final DiaryService diary;
    private final AuthorizationGuard guard;
    private final ObjectMapper json;

    DiaryController(DiaryService diary, AuthorizationGuard guard, ObjectMapper json) {
        this.diary = diary;
        this.guard = guard;
        this.json = json;
    }


    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    DiaryEntryResponse post(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @RequestPart("entry") String entryJson,
            @RequestPart(name = "photos", required = false) List<MultipartFile> devicePhotos)
            throws IOException {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        PostDiaryEntryRequest entry = json.readValue(entryJson, PostDiaryEntryRequest.class);
        return diary.post(
                member, entry.activityId(), entry.caption(), entry.fromDump(), bytesOf(devicePhotos));
    }


    @GetMapping
    List<DiaryEntryResponse> mine(
            @CurrentTraveler Traveler traveler, @PathVariable UUID itineraryId) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return diary.mine(member);
    }


    @GetMapping("/{entryId}")
    DiaryEntryResponse one(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID entryId) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return diary.mineById(member, entryId);
    }


    @PatchMapping("/{entryId}")
    DiaryEntryResponse recaption(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID entryId,
            @RequestBody UpdateDiaryEntryRequest request) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return diary.recaption(member, entryId, request.caption());
    }


    @PostMapping("/{entryId}/photos")
    @ResponseStatus(HttpStatus.CREATED)
    DiaryEntryResponse addDevicePhoto(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID entryId,
            @RequestPart("photo") MultipartFile photo)
            throws IOException {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return diary.addDevicePhoto(member, entryId, photo.getBytes());
    }


    @PostMapping("/{entryId}/photos/from-dump")
    @ResponseStatus(HttpStatus.CREATED)
    DiaryEntryResponse addPhotoFromDump(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID entryId,
            @RequestBody AddDiaryPhotoFromDumpRequest request) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return diary.addPhotoFromDump(member, entryId, request.photoId());
    }


    @DeleteMapping("/{entryId}/photos/{photoId}")
    DiaryEntryResponse removePhoto(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID entryId,
            @PathVariable UUID photoId) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        return diary.removePhoto(member, entryId, photoId);
    }


    @DeleteMapping("/{entryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID itineraryId,
            @PathVariable UUID entryId) {
        Membership member = guard.requireMember(traveler.id(), itineraryId);
        diary.delete(member, entryId);
    }


    private static List<byte[]> bytesOf(List<MultipartFile> parts) throws IOException {
        if (parts == null) {
            return List.of();
        }
        List<byte[]> bytes = new ArrayList<>(parts.size());
        for (MultipartFile part : parts) {
            bytes.add(part.getBytes());
        }
        return bytes;
    }
}
