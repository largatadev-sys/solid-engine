package com.largata.diary.web;

import com.largata.common.api.Page;
import com.largata.common.geo.PinPayload;
import com.largata.diary.Diary;
import com.largata.diary.DiaryService;
import com.largata.identity.AuthoredContentAudience;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import java.io.IOException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;


@RestController("com.largata.diary.web.DiaryController")
@RequestMapping("/v1/diaries")
class DiaryController {

    private final DiaryService diaries;
    private final AuthoredContentAudience audience;

    DiaryController(DiaryService diaries, AuthoredContentAudience audience) {
        this.diaries = diaries;
        this.audience = audience;
    }


    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    DiaryResponse create(@CurrentTraveler Traveler traveler, @RequestBody CreateDiaryRequest request) {
        return DiaryResponse.of(
                diaries.create(
                        traveler.id(),
                        request.title(),
                        request.destination(),
                        PinPayload.toPin(request.pin()),
                        request.startDate(),
                        request.endDate()));
    }


    @GetMapping
    Page<DiarySummaryResponse> mine(
            @CurrentTraveler Traveler traveler,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        return diaries.mine(traveler.id(), cursor, limit).map(DiarySummaryResponse::of);
    }


    @GetMapping("/{diaryId}")
    DiaryResponse read(@CurrentTraveler Traveler traveler, @PathVariable UUID diaryId) {
        Diary diary = diaries.read(diaryId);
        audience.requireReadable(traveler.id(), diary.authorId());
        return DiaryResponse.of(diaries.readWithDays(diaryId));
    }


    @PatchMapping("/{diaryId}")
    DiaryResponse describe(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID diaryId,
            @RequestBody DescribeDiaryRequest request) {
        return DiaryResponse.of(
                diaries.describe(
                        traveler.id(),
                        diaryId,
                        request.title(),
                        request.destination(),
                        PinPayload.toPin(request.pin()),
                        request.startDate(),
                        request.endDate()));
    }


    @DeleteMapping("/{diaryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@CurrentTraveler Traveler traveler, @PathVariable UUID diaryId) {
        diaries.delete(traveler.id(), diaryId);
    }


    @PutMapping("/{diaryId}/cover")
    DiaryResponse setCover(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID diaryId,
            @RequestPart("photo") MultipartFile photo)
            throws IOException {
        return DiaryResponse.of(diaries.setCover(traveler.id(), diaryId, photo.getBytes()));
    }


    @DeleteMapping("/{diaryId}/cover")
    DiaryResponse removeCover(@CurrentTraveler Traveler traveler, @PathVariable UUID diaryId) {
        return DiaryResponse.of(diaries.removeCover(traveler.id(), diaryId));
    }


    @PostMapping("/{diaryId}/days")
    @ResponseStatus(HttpStatus.CREATED)
    DiaryDayResponse addDay(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID diaryId,
            @RequestBody AddDiaryDayRequest request) {
        return DiaryDayResponse.of(
                diaries.addDay(
                        traveler.id(),
                        diaryId,
                        request.date(),
                        request.place(),
                        PinPayload.toPin(request.pin())));
    }


    @PatchMapping("/{diaryId}/days/{dayId}")
    DiaryDayResponse placeDay(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID diaryId,
            @PathVariable UUID dayId,
            @RequestBody PlaceDiaryDayRequest request) {
        return DiaryDayResponse.of(
                diaries.placeDay(
                        traveler.id(),
                        diaryId,
                        dayId,
                        request.place(),
                        PinPayload.toPin(request.pin())));
    }


    @DeleteMapping("/{diaryId}/days/{dayId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteDay(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID diaryId,
            @PathVariable UUID dayId) {
        diaries.deleteDay(traveler.id(), diaryId, dayId);
    }
}
