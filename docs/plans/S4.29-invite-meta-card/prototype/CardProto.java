import java.awt.*;
import java.awt.font.TextAttribute;
import java.awt.geom.Ellipse2D;
import java.awt.image.BufferedImage;
import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import javax.imageio.ImageIO;

public class CardProto {

    static final int W = 1200, H = 630, PANEL_W = 552;
    static final int PAD_L = 64, PAD_R = 84;
    static final int TEXT_W = W - PANEL_W - PAD_L - PAD_R;

    static final Color WELL = new Color(0xFFF7ED);
    static final Color COVER_BG = new Color(0xFFEDD5);
    static final Color BRAND = new Color(0xEA580C);
    static final Color KICKER = new Color(0xC2410C);
    static final Color INK = new Color(0x1C1917);
    static final Color MUTED = new Color(0x78716C);
    static final Color DIVIDER = new Color(0xFED7AA);
    static final Color DECOR2 = new Color(0xFDBA74);

    static Font outfit700, outfit800, noto400, noto700;

    public static void main(String[] args) throws Exception {
        outfit700 = Font.createFont(Font.TRUETYPE_FONT, new File("fonts/Outfit-700.ttf"));
        outfit800 = Font.createFont(Font.TRUETYPE_FONT, new File("fonts/Outfit-800.ttf"));
        noto400 = Font.createFont(Font.TRUETYPE_FONT, new File("fonts/NotoSans-400.ttf"));
        noto700 = Font.createFont(Font.TRUETYPE_FONT, new File("fonts/NotoSans-700.ttf"));

        render("card-1-cover.png", "Island Hopping in El Nido", "El Nido, Palawan · Mar 12–18",
                ImageIO.read(new File("cover-elnido.jpg")), null);
        render("card-2-fallback.png", "Island Hopping in El Nido", "El Nido, Palawan · Mar 12–18",
                null, "EN");
        render("card-3-longtitle.png", "Autumn Temples, Tea Houses & Night Markets of Kyoto and Osaka",
                "Kyoto · Nov 2–14", ImageIO.read(new File("cover-kyoto.jpg")), null);
        System.out.println("done");
    }

    static void render(String out, String title, String meta, BufferedImage cover, String initials)
            throws Exception {
        BufferedImage img = new BufferedImage(W, H, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);

        g.setColor(WELL);
        g.fillRect(0, 0, W, H);

        if (cover != null) {
            drawCover(g, cover);
        } else {
            drawFallbackPanel(g, initials);
        }

        GradientPaint seam = new GradientPaint(
                PANEL_W * 0.82f, 0, new Color(255, 247, 237, 0),
                PANEL_W, 0, WELL);
        g.setPaint(seam);
        g.fillRect((int) (PANEL_W * 0.82f), 0, PANEL_W - (int) (PANEL_W * 0.82f), H);

        drawTextPanel(g, title, meta);

        g.setColor(BRAND);
        g.fillRect(0, H - 10, W, 10);

        g.dispose();
        ImageIO.write(img, "png", new File(out));
    }

    static void drawCover(Graphics2D g, BufferedImage cover) {
        Shape clip = g.getClip();
        g.setClip(0, 0, PANEL_W, H);
        g.setColor(COVER_BG);
        g.fillRect(0, 0, PANEL_W, H);
        double scale = Math.max((double) PANEL_W / cover.getWidth(), (double) H / cover.getHeight());
        int sw = (int) Math.ceil(cover.getWidth() * scale);
        int sh = (int) Math.ceil(cover.getHeight() * scale);
        g.drawImage(cover, (PANEL_W - sw) / 2, (H - sh) / 2, sw, sh, null);
        g.setClip(clip);
    }

    static void drawFallbackPanel(Graphics2D g, String initials) {
        Shape clip = g.getClip();
        g.setClip(0, 0, PANEL_W, H);
        g.setColor(COVER_BG);
        g.fillRect(0, 0, PANEL_W, H);
        g.setColor(DIVIDER);
        g.fill(new Ellipse2D.Double(-110, -120, 420, 420));
        g.setColor(new Color(DECOR2.getRed(), DECOR2.getGreen(), DECOR2.getBlue(), 128));
        g.fill(new Ellipse2D.Double(PANEL_W - 60 - 300, H + 90 - 300, 300, 300));
        if (initials != null && !initials.isEmpty()) {
            Font f = outfit800.deriveFont(170f);
            g.setFont(f);
            g.setColor(new Color(KICKER.getRed(), KICKER.getGreen(), KICKER.getBlue(), 89));
            FontMetrics fm = g.getFontMetrics();
            int tw = fm.stringWidth(initials);
            int baseline = (H - fm.getAscent() - fm.getDescent()) / 2 + fm.getAscent();
            g.drawString(initials, (PANEL_W - tw) / 2, baseline);
        }
        g.setClip(clip);
    }

    static void drawTextPanel(Graphics2D g, String title, String meta) {
        boolean small = title.length() > 30;
        float titleSize = small ? 46f : 58f;
        float titleLh = small ? 1.15f : 1.12f;
        Font titleFont = outfit700.deriveFont(titleSize);
        List<String> lines = wrapClamp(g, titleFont, title, TEXT_W, 3);

        Font wordmarkFont = outfit800.deriveFont(34f);
        Font kickerFont = noto700.deriveFont(22f)
                .deriveFont(Map.of(TextAttribute.TRACKING, 4f / 22f));
        Font metaFont = noto400.deriveFont(28f);

        float wordmarkBox = 34 * 1.2f;
        float kickerBox = 22 * 1.2f;
        float titleLine = titleSize * titleLh;
        float metaBox = 28 * 1.3f;
        float total = wordmarkBox + 18 + kickerBox + 10 + titleLine * lines.size() + 10 + metaBox + 18 + 2;
        float y = (H - total) / 2f;
        int x = PANEL_W + PAD_L;

        y = drawLineBox(g, wordmarkFont, "Largata", BRAND, x, y, wordmarkBox);
        y += 18;
        y = drawLineBox(g, kickerFont, "YOU'RE INVITED", KICKER, x, y, kickerBox);
        y += 10;
        g.setFont(titleFont);
        g.setColor(INK);
        for (String line : lines) {
            y = drawLineBox(g, titleFont, line, INK, x, y, titleLine);
        }
        y += 10;
        y = drawLineBox(g, metaFont, meta, MUTED, x, y, metaBox);
        y += 18;
        g.setColor(DIVIDER);
        g.fillRect(x, Math.round(y), 64, 2);
    }

    static float drawLineBox(Graphics2D g, Font font, String text, Color color, int x, float top, float box) {
        g.setFont(font);
        g.setColor(color);
        FontMetrics fm = g.getFontMetrics();
        float leading = box - fm.getAscent() - fm.getDescent();
        float baseline = top + leading / 2f + fm.getAscent();
        g.drawString(text, x, baseline);
        return top + box;
    }

    static List<String> wrapClamp(Graphics2D g, Font font, String text, int width, int maxLines) {
        FontMetrics fm = g.getFontMetrics(font);
        List<String> lines = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (String word : text.split(" ")) {
            String candidate = current.isEmpty() ? word : current + " " + word;
            if (fm.stringWidth(candidate) <= width || current.isEmpty()) {
                current = new StringBuilder(candidate);
            } else {
                lines.add(current.toString());
                current = new StringBuilder(word);
            }
        }
        if (!current.isEmpty()) lines.add(current.toString());
        if (lines.size() > maxLines) {
            String last = lines.get(maxLines - 1);
            while (fm.stringWidth(last + "…") > width && !last.isEmpty()) {
                last = last.substring(0, last.length() - 1).stripTrailing();
            }
            lines = new ArrayList<>(lines.subList(0, maxLines - 1));
            lines.add(last + "…");
        }
        return lines;
    }
}
