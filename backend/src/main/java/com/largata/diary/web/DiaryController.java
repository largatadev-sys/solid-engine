package com.largata.diary.web;

import com.largata.common.api.Page;
import com.largata.diary.DiaryService;
import com.largata.identity.Traveler;
import com.largata.identity.web.CurrentTraveler;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;


@RestController("com.largata.diary.web.DiaryController")
@RequestMapping("/v1/diaries")
class DiaryController {

    private final DiaryService diaries;

    DiaryController(DiaryService diaries) {
        this.diaries = diaries;
    }


    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    DiaryResponse create(@CurrentTraveler Traveler traveler, @RequestBody CreateDiaryRequest request) {
        return DiaryResponse.of(diaries.create(traveler.id(), request.title()));
    }


    @GetMapping
    Page<DiaryResponse> mine(
            @CurrentTraveler Traveler traveler,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        return diaries.mine(traveler.id(), cursor, limit).map(DiaryResponse::of);
    }


    @GetMapping("/{diaryId}")
    DiaryResponse read(@CurrentTraveler Traveler traveler, @PathVariable UUID diaryId) {
        return DiaryResponse.of(diaries.read(diaryId));
    }


    @PatchMapping("/{diaryId}")
    DiaryResponse retitle(
            @CurrentTraveler Traveler traveler,
            @PathVariable UUID diaryId,
            @RequestBody RetitleDiaryRequest request) {
        return DiaryResponse.of(diaries.retitle(traveler.id(), diaryId, request.title()));
    }


    @DeleteMapping("/{diaryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@CurrentTraveler Traveler traveler, @PathVariable UUID diaryId) {
        diaries.delete(traveler.id(), diaryId);
    }
}
