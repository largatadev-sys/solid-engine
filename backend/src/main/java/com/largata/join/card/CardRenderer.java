package com.largata.join.card;

import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics2D;
import java.awt.GradientPaint;
import java.awt.RenderingHints;
import java.awt.Shape;
import java.awt.font.TextAttribute;
import java.awt.geom.Ellipse2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Map;
import javax.imageio.ImageIO;
import org.springframework.stereotype.Component;


@Component
public class CardRenderer {

    private final CardFonts fonts;

    CardRenderer(CardFonts fonts) {
        this.fonts = fonts;
    }


    public byte[] render(CardSubject subject) {
        BufferedImage card =
                new BufferedImage(CardArt.WIDTH, CardArt.HEIGHT, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = card.createGraphics();
        try {
            paint(g, subject);
        } finally {
            g.dispose();
        }
        return encode(card);
    }


    private void paint(Graphics2D g, CardSubject subject) {
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(
                RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g.setRenderingHint(
                RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);

        g.setColor(CardArt.WELL);
        g.fillRect(0, 0, CardArt.WIDTH, CardArt.HEIGHT);

        BufferedImage cover = decodeCover(subject.coverBytes());
        if (cover == null) {
            paintFallbackPanel(g, DestinationInitials.of(subject.destination()));
        } else {
            paintCover(g, cover);
        }
        paintSeam(g);
        paintTextPanel(g, subject);

        g.setColor(CardArt.BRAND);
        g.fillRect(
                0,
                CardArt.HEIGHT - CardArt.BRAND_BAR_HEIGHT,
                CardArt.WIDTH,
                CardArt.BRAND_BAR_HEIGHT);
    }


    private static void paintCover(Graphics2D g, BufferedImage cover) {
        Shape outer = g.getClip();
        g.setClip(0, 0, CardArt.PANEL_WIDTH, CardArt.HEIGHT);
        g.setColor(CardArt.COVER_BACKGROUND);
        g.fillRect(0, 0, CardArt.PANEL_WIDTH, CardArt.HEIGHT);

        double scale =
                Math.max(
                        (double) CardArt.PANEL_WIDTH / cover.getWidth(),
                        (double) CardArt.HEIGHT / cover.getHeight());
        int width = (int) Math.ceil(cover.getWidth() * scale);
        int height = (int) Math.ceil(cover.getHeight() * scale);
        g.drawImage(
                cover,
                (CardArt.PANEL_WIDTH - width) / 2,
                (CardArt.HEIGHT - height) / 2,
                width,
                height,
                null);
        g.setClip(outer);
    }


    private void paintFallbackPanel(Graphics2D g, String initials) {
        Shape outer = g.getClip();
        g.setClip(0, 0, CardArt.PANEL_WIDTH, CardArt.HEIGHT);
        g.setColor(CardArt.COVER_BACKGROUND);
        g.fillRect(0, 0, CardArt.PANEL_WIDTH, CardArt.HEIGHT);

        g.setColor(CardArt.DIVIDER);
        g.fill(new Ellipse2D.Double(-110, -120, 420, 420));
        g.setColor(halfOpaque(CardArt.DECOR));
        g.fill(new Ellipse2D.Double(CardArt.PANEL_WIDTH - 360, CardArt.HEIGHT - 210, 300, 300));

        if (!initials.isEmpty()) {
            Font face = fonts.covering(fonts.display(CardArt.INITIALS_SIZE), initials);
            g.setFont(face);
            g.setColor(fadedInitials());
            FontMetrics metrics = g.getFontMetrics();
            int baseline =
                    (CardArt.HEIGHT - metrics.getAscent() - metrics.getDescent()) / 2
                            + metrics.getAscent();
            g.drawString(
                    initials, (CardArt.PANEL_WIDTH - metrics.stringWidth(initials)) / 2, baseline);
        }
        g.setClip(outer);
    }


    private static void paintSeam(Graphics2D g) {
        int from = Math.round(CardArt.PANEL_WIDTH * CardArt.SEAM_START);
        g.setPaint(
                new GradientPaint(
                        from,
                        0,
                        new Color(
                                CardArt.WELL.getRed(),
                                CardArt.WELL.getGreen(),
                                CardArt.WELL.getBlue(),
                                0),
                        CardArt.PANEL_WIDTH,
                        0,
                        CardArt.WELL));
        g.fillRect(from, 0, CardArt.PANEL_WIDTH - from, CardArt.HEIGHT);
    }


    private void paintTextPanel(Graphics2D g, CardSubject subject) {
        String title = subject.title();
        String metaLine = subject.metaLine();
        float titleSize = TitleBlock.sizeFor(title);
        Font titleFont = fonts.covering(fonts.title(titleSize), title);
        FontMetrics titleMetrics = g.getFontMetrics(titleFont);
        List<String> lines =
                TitleBlock.wrapClamp(title, CardArt.TEXT_WIDTH, titleMetrics::stringWidth);

        Font wordmarkFont = fonts.display(CardArt.WORDMARK_SIZE);
        Font kickerFont = tracked(fonts.kicker(CardArt.KICKER_SIZE));
        Font metaFont =
                metaLine == null ? fonts.body(CardArt.META_SIZE)
                        : fonts.covering(fonts.body(CardArt.META_SIZE), metaLine);

        float wordmarkBox = CardArt.WORDMARK_SIZE * 1.2f;
        float kickerBox = CardArt.KICKER_SIZE * 1.2f;
        float titleLine = titleSize * TitleBlock.lineHeightFor(title);
        float metaBox = metaLine == null ? 0f : CardArt.META_SIZE * 1.3f;
        float metaGap = metaLine == null ? 0f : CardArt.TEXT_GAP;

        float total =
                wordmarkBox
                        + CardArt.BLOCK_GAP
                        + kickerBox
                        + CardArt.TEXT_GAP
                        + titleLine * lines.size()
                        + metaGap
                        + metaBox
                        + CardArt.BLOCK_GAP
                        + CardArt.DIVIDER_HEIGHT;

        float y = (CardArt.HEIGHT - total) / 2f;
        int x = CardArt.PANEL_WIDTH + CardArt.PADDING_LEFT;

        y = drawLineBox(g, wordmarkFont, CardArt.WORDMARK, CardArt.BRAND, x, y, wordmarkBox);
        y += CardArt.BLOCK_GAP;
        y = drawLineBox(g, kickerFont, subject.kicker(), CardArt.KICKER, x, y, kickerBox);
        y += CardArt.TEXT_GAP;
        for (String line : lines) {
            y = drawLineBox(g, titleFont, line, CardArt.INK, x, y, titleLine);
        }
        if (metaLine != null) {
            y += CardArt.TEXT_GAP;
            y = drawLineBox(g, metaFont, metaLine, CardArt.MUTED, x, y, metaBox);
        }
        y += CardArt.BLOCK_GAP;

        g.setColor(CardArt.DIVIDER);
        g.fillRect(x, Math.round(y), CardArt.DIVIDER_WIDTH, CardArt.DIVIDER_HEIGHT);
    }


    private static float drawLineBox(
            Graphics2D g, Font font, String text, Color color, int x, float top, float box) {
        g.setFont(font);
        g.setColor(color);
        FontMetrics metrics = g.getFontMetrics();
        float leading = box - metrics.getAscent() - metrics.getDescent();
        g.drawString(text, x, top + leading / 2f + metrics.getAscent());
        return top + box;
    }


    private static Font tracked(Font font) {
        return font.deriveFont(
                Map.of(TextAttribute.TRACKING, CardArt.KICKER_TRACKING / font.getSize2D()));
    }


    private static Color halfOpaque(Color color) {
        return new Color(color.getRed(), color.getGreen(), color.getBlue(), 128);
    }


    private static Color fadedInitials() {
        return new Color(
                CardArt.KICKER.getRed(),
                CardArt.KICKER.getGreen(),
                CardArt.KICKER.getBlue(),
                Math.round(255 * 0.35f));
    }


    private static BufferedImage decodeCover(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return null;
        }
        try {
            return ImageIO.read(new ByteArrayInputStream(bytes));
        } catch (IOException undecodable) {
            return null;
        }
    }


    private static byte[] encode(BufferedImage card) {
        ByteArrayOutputStream png = new ByteArrayOutputStream();
        try {
            ImageIO.write(card, "png", png);
        } catch (IOException unwritable) {
            throw new UncheckedIOException(unwritable);
        }
        return png.toByteArray();
    }
}
