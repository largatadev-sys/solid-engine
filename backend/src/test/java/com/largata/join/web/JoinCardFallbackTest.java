package com.largata.join.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.largata.common.error.NotFoundException;
import com.largata.join.JoinCard;
import com.largata.join.JoinCardService;
import com.largata.join.card.CardRenderer;
import com.largata.join.card.CardSubject;
import com.largata.join.card.GenericCard;
import java.io.UncheckedIOException;
import java.io.IOException;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;


class JoinCardFallbackTest {

    private static final byte[] GENERIC = {(byte) 0x89, 'P', 'N', 'G'};

    private static final String MINTED = "Ab3-_9xKq7Z";

    private final JoinCardService cards = mock(JoinCardService.class);
    private final CardRenderer renderer = mock(CardRenderer.class);
    private final GenericCard generic = mock(GenericCard.class);

    private final JoinCardController controller =
            new JoinCardController(
                    cards,
                    renderer,
                    generic,
                    new CardUrls("http://api.test", "http://web.test"));


    @Test
    void aRendererFailureServesTheGenericCardRatherThanA500() {
        when(generic.bytes()).thenReturn(GENERIC);
        when(cards.cardFor(anyString())).thenReturn(liveCard());
        when(renderer.render(any())).thenThrow(new IllegalStateException("font blew up"));

        ResponseEntity<byte[]> answer = controller.card(MINTED);

        assertThat(answer.getStatusCode().value()).isEqualTo(200);
        assertThat(answer.getBody()).isEqualTo(GENERIC);
    }


    @Test
    void aCoverThatCannotBeReadDegradesInsteadOfErroring() {
        when(generic.bytes()).thenReturn(GENERIC);
        when(cards.cardFor(anyString()))
                .thenThrow(new UncheckedIOException(new IOException("object store is down")));

        ResponseEntity<byte[]> answer = controller.card(MINTED);

        assertThat(answer.getStatusCode().value()).isEqualTo(200);
        assertThat(answer.getBody()).isEqualTo(GENERIC);
    }


    @Test
    void anUnknownTokenKeepsIts404RatherThanBeingPaperedOverByTheGenericCard() {
        when(cards.cardFor(anyString())).thenThrow(new UnknownToken());

        assertThatThrownBy(() -> controller.card(MINTED)).isInstanceOf(NotFoundException.class);
    }


    @Test
    void theCardIsStillPubliclyCacheableWhenItIsTheGenericFallback() {
        when(generic.bytes()).thenReturn(GENERIC);
        when(cards.cardFor(anyString())).thenReturn(liveCard());
        when(renderer.render(any())).thenThrow(new IllegalStateException("font blew up"));

        assertThat(controller.card(MINTED).getHeaders().getCacheControl()).contains("public");
    }


    private static JoinCard liveCard() {
        return new JoinCard(
                true, "Trip", "Palawan", 1, CardSubject.invitation("Trip", "Palawan", "Palawan", null));
    }


    private static final class UnknownToken extends NotFoundException {
        private UnknownToken() {
            super("JOIN_LINK_NOT_FOUND", "This invite link is not valid.");
        }
    }
}
