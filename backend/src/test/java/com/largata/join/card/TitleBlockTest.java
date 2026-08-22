package com.largata.join.card;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.function.ToIntFunction;
import org.junit.jupiter.api.Test;


class TitleBlockTest {

    private static final int COLUMN = 100;

    private static final ToIntFunction<String> TEN_PER_CHARACTER = text -> text.length() * 10;

    private static final String OVERFLOWING = "aaaa bbbb cccc dddd eeee ffff gggg hhhh";


    @Test
    void aShortTitleKeepsTheLargeSize() {
        assertThat(TitleBlock.sizeFor("Island Hopping in El Nido")).isEqualTo(TitleBlock.LARGE);
    }


    @Test
    void exactlyThirtyCharactersIsStillLarge() {
        assertThat("x".repeat(30)).hasSize(30);
        assertThat(TitleBlock.sizeFor("x".repeat(30))).isEqualTo(TitleBlock.LARGE);
    }


    @Test
    void thirtyOneCharactersStepsDown() {
        assertThat(TitleBlock.sizeFor("x".repeat(31))).isEqualTo(TitleBlock.SMALL);
    }


    @Test
    void itWrapsGreedilyAtTheColumn() {
        assertThat(wrap("aaaa bbbb cccc")).containsExactly("aaaa bbbb", "cccc");
    }


    @Test
    void aLineFillingTheColumnExactlyIsNotWrappedEarly() {
        assertThat(wrap("aaaa bbbbb")).containsExactly("aaaa bbbbb");
    }


    @Test
    void aWordWiderThanTheColumnGetsItsOwnLineRatherThanLoopingForever() {
        assertThat(wrap("aaaaaaaaaaaaaaaa bb")).containsExactly("aaaaaaaaaaaaaaaa", "bb");
    }


    @Test
    void itClampsAtThreeLinesWithAnEllipsis() {
        List<String> lines = wrap(OVERFLOWING);
        assertThat(lines).hasSize(3);
        assertThat(lines.getLast()).endsWith("…");
    }


    @Test
    void theClampedLineStillFitsTheColumnOnceTheEllipsisIsAdded() {
        List<String> lines = wrap(OVERFLOWING);
        assertThat(TEN_PER_CHARACTER.applyAsInt(lines.getLast())).isLessThanOrEqualTo(COLUMN);
    }


    @Test
    void aTitleThatFitsExactlyThreeLinesIsNotEllipsised() {
        List<String> lines = wrap("aaaa bbbb cccc dddd eeee ffff");
        assertThat(lines).hasSize(3);
        assertThat(lines.getLast()).doesNotEndWith("…");
    }


    @Test
    void blankTitleYieldsNoLinesRatherThanOneEmptyOne() {
        assertThat(wrap("   ")).isEmpty();
    }


    @Test
    void runsOfWhitespaceDoNotBecomeEmptyWords() {
        assertThat(wrap("aa   bb")).containsExactly("aa bb");
    }


    private static List<String> wrap(String title) {
        return TitleBlock.wrapClamp(title, COLUMN, TEN_PER_CHARACTER);
    }
}
