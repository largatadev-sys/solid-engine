package com.largata.join.web;

import com.largata.join.JoinCard;
import com.largata.join.JoinCardService;
import com.largata.join.card.CardRenderer;
import com.largata.join.card.CardSubject;
import com.largata.join.card.GenericCard;
import com.largata.join.card.PreviewPage;
import com.largata.join.card.PreviewSubject;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/v1/join")
class JoinCardController {

    private static final Logger log = LoggerFactory.getLogger(JoinCardController.class);

    private static final Duration CARD_MAX_AGE = Duration.ofHours(1);

    private static final int TOKEN_LOG_PREFIX = 8;

    private final JoinCardService cards;
    private final CardRenderer renderer;
    private final GenericCard generic;
    private final CardUrls urls;

    JoinCardController(
            JoinCardService cards, CardRenderer renderer, GenericCard generic, CardUrls urls) {
        this.cards = cards;
        this.renderer = renderer;
        this.generic = generic;
        this.urls = urls;
    }


    @GetMapping(value = "/{token}/card.png", produces = MediaType.IMAGE_PNG_VALUE)
    ResponseEntity<byte[]> card(@PathVariable String token) {
        CardSubject subject = cards.cardFor(token).subject();
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .cacheControl(CacheControl.maxAge(CARD_MAX_AGE).cachePublic())
                .body(drawnOrGeneric(subject, token));
    }


    private byte[] drawnOrGeneric(CardSubject subject, String token) {
        try {
            return renderer.render(subject);
        } catch (RuntimeException unrenderable) {
            log.warn(
                    "Invite card render failed, serving the generic card: tokenPrefix={} cause={}",
                    prefixOf(token),
                    unrenderable.getClass().getSimpleName());
            return generic.bytes();
        }
    }


    @GetMapping(value = "/{token}/preview", produces = MediaType.TEXT_HTML_VALUE)
    ResponseEntity<String> preview(@PathVariable String token) {
        JoinCard card = cards.cardFor(token);
        PreviewSubject subject =
                new PreviewSubject(
                        card.tripTitle(),
                        card.metaLine(),
                        urls.cardUrlFor(token, card.version()),
                        urls.landingUrlFor(token, card.version()),
                        card.live());
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .cacheControl(CacheControl.noCache())
                .body(PreviewPage.render(subject));
    }


    private static String prefixOf(String token) {
        return token.substring(0, Math.min(TOKEN_LOG_PREFIX, token.length()));
    }
}
