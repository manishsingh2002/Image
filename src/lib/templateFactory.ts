import type { AISuggestion, Background, DesignDocument, DesignElement, DesignTemplate, PlatformId } from "../types";
import { PALETTES, STOCK_IMAGES, platformById } from "./constants";
import { uid } from "./utils";

// ─── Element helper ─────────────────────────────────────────────────────────
const el = (p: Partial<DesignElement> & { type: DesignElement["type"] }): DesignElement => ({
  id: uid("el"),
  x: 0, y: 0, width: 100, height: 100,
  rotation: 0, opacity: 1, visible: true, locked: false,
  ...p,
  name: p.name || (p.type === "text" ? "Text" : p.type === "image" ? "Image" : p.type[0].toUpperCase() + p.type.slice(1)),
});

const txt = (
  x: number, y: number, w: number, text: string, size: number,
  opts: Partial<DesignElement> = {}
): DesignElement =>
  el({
    type: "text", x, y, width: w, height: Math.ceil(size * 1.25 * text.split("\n").length),
    text, fontSize: size, fontFamily: "Poppins", fontStyle: "normal",
    letterSpacing: 0, lineHeight: 1.18, align: "left", color: "#111",
    ...opts,
    name: opts.name || (size >= 60 ? "Heading" : "Text"),
  });

const photo = STOCK_IMAGES;
const ph = (id?: string) => (id ? photo.find((p) => p.id === id)?.src : undefined) || photo[0].src;

interface Ctx {
  W: number; H: number; fs: number;
  pal: (typeof PALETTES)[number];
  fonts: { display: string; body: string };
  c: Record<string, string | undefined>;
  photoSrc?: string;
}

// ─── Layout archetypes ─────────────────────────────────────────────────────
type Arch = (x: Ctx) => DesignElement[];

const label = (x: Ctx, X: number, Y: number, w: number, color: string, align: "left" | "center" = "left") =>
  txt(X, Y, w, (x.c.l || "ANNOUNCEMENT").toUpperCase(), 21 * x.fs, {
    fontFamily: x.fonts.body, fontStyle: "bold", letterSpacing: 5 * x.fs, color, align, name: "Label",
  });

const ctaPill = (x: Ctx, X: number, Y: number, w: number, h: number, alignCenter = false) => {
  const text = (x.c.cta || "SHOP NOW").toUpperCase();
  const pw = w;
  const px = alignCenter ? X - pw / 2 : X;
  return [
    el({ type: "rect", x: px, y: Y, width: pw, height: h, radius: h / 2, fill: x.pal.accent, name: "CTA button" }),
    txt(px, Y + h / 2 - 15 * x.fs, pw, text, 25 * x.fs, {
      fontFamily: x.fonts.body, fontStyle: "bold", letterSpacing: 2 * x.fs,
      color: x.pal.bg, align: "center", lineHeight: 1.2, name: "CTA text",
    }),
  ];
};

const archSplit: Arch = (x) => {
  const { W, H, fs, pal, c } = x;
  const iw = Math.round(W * 0.52);
  return [
    el({ type: "image", x: 0, y: 0, width: iw, height: H, src: x.photoSrc, name: "Product image" }),
    el({ type: "rect", x: iw - 14 * fs, y: H * 0.16, width: 8 * fs, height: H * 0.1, fill: pal.accent, name: "Accent bar" }),
    label(x, iw + 64 * fs, H * 0.14, W - iw - 128 * fs, pal.muted),
    txt(iw + 64 * fs, H * 0.2, W - iw - 128 * fs, c.h || "New Season\nCollection", 74 * fs, {
      fontFamily: x.fonts.display, fontStyle: "bold", color: pal.ink, lineHeight: 1.06, name: "Heading",
    }),
    txt(iw + 64 * fs, H * 0.52, W - iw - 140 * fs, c.s || "Crafted details, timeless style. Discover the edit this week.", 27 * fs, {
      fontFamily: x.fonts.body, color: pal.muted, lineHeight: 1.5, name: "Description",
    }),
    ...ctaPill(x, iw + 64 * fs, H * 0.74, 290 * fs, 74 * fs),
    txt(36 * fs, H - 60 * fs, iw - 72 * fs, "@yourbrand", 20 * fs, { fontFamily: x.fonts.body, color: "rgba(255,255,255,.85)", name: "Handle" }),
  ];
};

const archFullbleed: Arch = (x) => {
  const { W, H, fs, pal, c } = x;
  return [
    el({ type: "image", x: 0, y: 0, width: W, height: H, src: x.photoSrc, name: "Photo" }),
    el({
      type: "rect", x: 0, y: 0, width: W, height: H, name: "Scrim",
      fill: { kind: "linear", angle: 180, stops: [{ color: "rgba(0,0,0,0)", offset: 0.25 }, { color: "rgba(0,0,0,0.78)", offset: 1 }] },
    }),
    label(x, 72 * fs, H * 0.6, W - 144 * fs, "rgba(255,255,255,.75)"),
    txt(72 * fs, H * 0.655, W - 144 * fs, c.h || "Taste the\nExtraordinary", 86 * fs, {
      fontFamily: x.fonts.display, fontStyle: "bold", color: "#ffffff", lineHeight: 1.05, name: "Heading",
    }),
    txt(72 * fs, H * 0.655 + 200 * fs, W - 220 * fs, c.s || "Reserve your table this weekend — limited evening seating.", 27 * fs, {
      fontFamily: x.fonts.body, color: "rgba(255,255,255,.82)", lineHeight: 1.5, name: "Description",
    }),
    ...ctaPill(x, 72 * fs, H * 0.87, 300 * fs, 76 * fs),
  ];
};

const archBadge: Arch = (x) => {
  const { W, H, fs, pal, c } = x;
  const r = 175 * fs;
  const cxp = W / 2, cyp = H * 0.44;
  return [
    el({ type: "rect", x: 0, y: 0, width: W, height: H, fill: pal.soft, name: "Backdrop", radius: 0 }),
    el({ type: "ellipse", x: cxp - 260 * fs, y: cyp - 260 * fs, width: 520 * fs, height: 520 * fs, fill: pal.bg, opacity: 0.5, name: "Halo" }),
    label(x, 90 * fs, H * 0.09, W - 180 * fs, pal.muted, "center"),
    txt(90 * fs, H * 0.14, W - 180 * fs, c.h || "FESTIVAL\nSALE", 92 * fs, {
      fontFamily: x.fonts.display, fontStyle: "bold", color: pal.ink, align: "center", lineHeight: 1.02, name: "Heading",
    }),
    el({ type: "ellipse", x: cxp - r, y: cyp - r, width: r * 2, height: r * 2, fill: pal.accent, name: "Offer badge", shadow: { color: "rgba(0,0,0,0.25)", blur: 40 * fs, offsetX: 0, offsetY: 14 * fs, opacity: 0.6 } }),
    txt(cxp - r, cyp - 62 * fs, r * 2, c.o || "20%", 108 * fs, {
      fontFamily: x.fonts.display, fontStyle: "bold", color: pal.bg, align: "center", lineHeight: 1, name: "Offer",
    }),
    txt(cxp - r, cyp + 58 * fs, r * 2, "OFF", 34 * fs, {
      fontFamily: x.fonts.body, fontStyle: "bold", letterSpacing: 8 * fs, color: pal.bg, align: "center", name: "Offer suffix",
    }),
    txt(110 * fs, H * 0.72, W - 220 * fs, c.s || "On all handcrafted pieces. In-store and online.", 27 * fs, {
      fontFamily: x.fonts.body, color: pal.muted, align: "center", lineHeight: 1.45, name: "Description",
    }),
    ...ctaPill(x, W / 2, H * 0.82, 320 * fs, 78 * fs, true),
  ];
};

const archMinimal: Arch = (x) => {
  const { W, H, fs, pal, c } = x;
  const m = 84 * fs;
  return [
    el({ type: "rect", x: m, y: m, width: 26 * fs, height: 26 * fs, fill: pal.accent, name: "Mark" }),
    label(x, m, m + 66 * fs, W - m * 2, pal.muted),
    el({ type: "line", x: m, y: H * 0.3, width: W - m * 2, height: 0, points: [0, 0, W - m * 2, 0], stroke: pal.ink, strokeWidth: 2 * fs, name: "Rule" }),
    txt(m, H * 0.34, W - m * 2, c.h || "Quiet\nLuxury", 118 * fs, {
      fontFamily: x.fonts.display, fontStyle: "bold", color: pal.ink, lineHeight: 0.98, name: "Heading",
    }),
    txt(m, H * 0.72, W * 0.62, c.s || "A capsule of nine pieces. Released Friday, 10 AM.", 28 * fs, {
      fontFamily: x.fonts.body, color: pal.muted, lineHeight: 1.55, name: "Description",
    }),
    txt(m, H - m - 30 * fs, W - m * 2, (c.cta || "yourbrand.com").toUpperCase(), 24 * fs, {
      fontFamily: x.fonts.body, fontStyle: "bold", letterSpacing: 4 * fs, color: pal.accent, name: "CTA",
    }),
  ];
};

const archEditorial: Arch = (x) => {
  const { W, H, fs, pal, c } = x;
  const m = 46 * fs;
  return [
    el({ type: "rect", x: m, y: m, width: W - m * 2, height: H - m * 2, fill: "transparent", stroke: pal.ink, strokeWidth: 2 * fs, name: "Frame", radius: 0 }),
    label(x, 90 * fs, H * 0.2, W - 180 * fs, pal.muted, "center"),
    txt(90 * fs, H * 0.27, W - 180 * fs, c.h || "The Art of\nSlow Living", 84 * fs, {
      fontFamily: x.fonts.display, fontStyle: "italic", color: pal.ink, align: "center", lineHeight: 1.12, name: "Heading",
    }),
    el({ type: "line", x: W / 2 - 44 * fs, y: H * 0.6, width: 88 * fs, height: 0, points: [0, 0, 88 * fs, 0], stroke: pal.accent, strokeWidth: 4 * fs, name: "Rule" }),
    txt(140 * fs, H * 0.64, W - 280 * fs, c.s || "An evening of conversation, craft and quiet company.", 26 * fs, {
      fontFamily: x.fonts.body, fontStyle: "italic", color: pal.muted, align: "center", lineHeight: 1.6, name: "Description",
    }),
    txt(90 * fs, H - 130 * fs, W - 180 * fs, ((c.a || "HOSTED BY ATELIER NINE") + "  ·  " + (c.l || "OCT 24")).toUpperCase(), 20 * fs, {
      fontFamily: x.fonts.body, fontStyle: "bold", letterSpacing: 3 * fs, color: pal.ink, align: "center", name: "Meta",
    }),
  ];
};

const archFrame: Arch = (x) => {
  const { W, H, fs, pal, c } = x;
  const m = 76 * fs;
  const pw = W - m * 2;
  const phh = Math.min(H * 0.56, pw * 0.95);
  return [
    el({ type: "rect", x: m - 22 * fs, y: m - 22 * fs, width: pw + 44 * fs, height: phh + 44 * fs, fill: "#ffffff", name: "Mat", shadow: { color: "rgba(20,20,20,0.18)", blur: 50 * fs, offsetX: 0, offsetY: 18 * fs, opacity: 0.7 } }),
    el({ type: "image", x: m, y: m, width: pw, height: phh, src: x.photoSrc, name: "Photo" }),
    txt(m, m + phh + 84 * fs, pw, c.h || "Sunday\nSupper Club", 66 * fs, {
      fontFamily: x.fonts.display, fontStyle: "bold", color: pal.ink, lineHeight: 1.05, name: "Heading",
    }),
    el({ type: "line", x: m, y: H - 150 * fs, width: 120 * fs, height: 0, points: [0, 0, 120 * fs, 0], stroke: pal.accent, strokeWidth: 5 * fs, name: "Rule" }),
    txt(m, H - 128 * fs, pw, (c.s || "Four courses · one table · every weekend").toUpperCase(), 22 * fs, {
      fontFamily: x.fonts.body, fontStyle: "bold", letterSpacing: 3 * fs, color: pal.muted, name: "Caption",
    }),
  ];
};

const archQuote: Arch = (x) => {
  const { W, H, fs, pal, c } = x;
  return [
    txt(90 * fs, H * 0.12, 300 * fs, "“", 320 * fs, {
      fontFamily: "Playfair Display", color: pal.accent, lineHeight: 0.8, name: "Quote mark",
    }),
    txt(110 * fs, H * 0.3, W - 220 * fs, c.q || "Design is intelligence\nmade visible.", 64 * fs, {
      fontFamily: x.fonts.display, fontStyle: "italic", color: pal.ink, lineHeight: 1.3, name: "Quote",
    }),
    el({ type: "line", x: 110 * fs, y: H * 0.68, width: 90 * fs, height: 0, points: [0, 0, 90 * fs, 0], stroke: pal.accent, strokeWidth: 5 * fs, name: "Rule" }),
    txt(110 * fs, H * 0.71, W - 220 * fs, (c.a || "ALINA WHEELER").toUpperCase(), 24 * fs, {
      fontFamily: x.fonts.body, fontStyle: "bold", letterSpacing: 5 * fs, color: pal.muted, name: "Author",
    }),
    el({ type: "ellipse", x: W - 170 * fs, y: H - 170 * fs, width: 90 * fs, height: 90 * fs, fill: pal.soft, name: "Dot" }),
    el({ type: "ellipse", x: W - 130 * fs, y: H - 130 * fs, width: 54 * fs, height: 54 * fs, fill: pal.accent, name: "Dot small" }),
  ];
};

const archThumb: Arch = (x) => {
  const { W, H, fs, pal, c } = x;
  const iw = Math.round(W * 0.47);
  return [
    el({ type: "image", x: W - iw, y: 0, width: iw, height: H, src: x.photoSrc, name: "Photo" }),
    el({
      type: "rect", x: W - iw - 120 * fs, y: 0, width: 120 * fs + iw, height: H, name: "Edge fade",
      fill: { kind: "linear", angle: 90, stops: [{ color: pal.bg, offset: 0 }, { color: "rgba(0,0,0,0)", offset: 1 }] },
    }),
    el({ type: "rect", x: 0, y: 0, width: W - iw + 20 * fs, height: H, fill: pal.bg, name: "Panel" }),
    el({ type: "rect", x: 70 * fs, y: 62 * fs, width: 170 * fs, height: 52 * fs, radius: 26 * fs, fill: pal.accent, name: "Tag chip" }),
    txt(70 * fs, 74 * fs, 170 * fs, (c.l || "EP. 12").toUpperCase(), 24 * fs, {
      fontFamily: x.fonts.body, fontStyle: "bold", letterSpacing: 2 * fs, color: pal.bg, align: "center", name: "Tag",
    }),
    txt(70 * fs, H * 0.26, W * 0.52, c.h || "I TESTED\nEVERY\nCAMERA", 92 * fs, {
      fontFamily: x.fonts.display, fontStyle: "bold", color: pal.ink, lineHeight: 1.0, name: "Heading",
    }),
    el({ type: "rect", x: 74 * fs, y: H * 0.26 + 300 * fs, width: 210 * fs, height: 14 * fs, fill: pal.accent, name: "Underline" }),
    txt(70 * fs, H - 120 * fs, W * 0.5, c.s || "The honest 2025 buyer's guide", 30 * fs, {
      fontFamily: x.fonts.body, fontStyle: "bold", color: pal.muted, name: "Sub",
    }),
    el({ type: "ellipse", x: W - iw / 2 - 56 * fs, y: H - 150 * fs, width: 112 * fs, height: 112 * fs, fill: pal.accent, name: "Play", shadow: { color: "rgba(0,0,0,0.35)", blur: 30 * fs, offsetX: 0, offsetY: 10 * fs, opacity: 0.8 } }),
    el({ type: "path", x: W - iw / 2 - 20 * fs, y: H - 122 * fs, width: 52 * fs, height: 56 * fs, data: "M0 0 L52 28 L0 56 Z", fill: pal.bg, name: "Play icon" }),
  ];
};

const archStack: Arch = (x) => {
  const { W, H, fs, pal, c } = x;
  const ih = Math.round(H * 0.58);
  return [
    el({ type: "image", x: 0, y: 0, width: W, height: ih, src: x.photoSrc, name: "Photo" }),
    el({ type: "ellipse", x: W - 300 * fs, y: ih - 150 * fs, width: 300 * fs, height: 300 * fs, fill: pal.accent, name: "Seal", shadow: { color: "rgba(0,0,0,0.25)", blur: 30 * fs, offsetX: 0, offsetY: 8 * fs, opacity: 0.7 } }),
    txt(W - 300 * fs, ih - 42 * fs, 300 * fs, (c.o || "NEW").toUpperCase(), 40 * fs, {
      fontFamily: x.fonts.display, fontStyle: "bold", color: pal.bg, align: "center", lineHeight: 1, name: "Seal text",
    }),
    label(x, 72 * fs, ih + 70 * fs, W - 144 * fs, pal.muted),
    txt(72 * fs, ih + 130 * fs, W - 144 * fs, c.h || "The Autumn\nEdit", 88 * fs, {
      fontFamily: x.fonts.display, fontStyle: "bold", color: pal.ink, lineHeight: 1.04, name: "Heading",
    }),
    txt(72 * fs, ih + 400 * fs, W - 180 * fs, c.s || "Twelve pieces. One palette. Swipe up to shop the drop.", 27 * fs, {
      fontFamily: x.fonts.body, color: pal.muted, lineHeight: 1.5, name: "Description",
    }),
    ...ctaPill(x, W / 2, H - 260 * fs, 340 * fs, 80 * fs, true),
  ];
};

const archDiagonal: Arch = (x) => {
  const { W, H, fs, pal, c } = x;
  const x1 = Math.round(W * 0.66), x2 = Math.round(W * 0.42);
  return [
    el({ type: "image", x: 0, y: 0, width: W, height: H, src: x.photoSrc, name: "Photo" }),
    el({ type: "path", x: 0, y: 0, width: W, height: H, data: `M0 0 L${x1} 0 L${x2} ${H} L0 ${H} Z`, fill: pal.bg, name: "Panel" }),
    el({ type: "path", x: 0, y: 0, width: W, height: H, data: `M${x1 + 26 * fs} 0 L${x1 + 34 * fs} 0 L${x2 + 34 * fs} ${H} L${x2 + 26 * fs} ${H} Z`, fill: pal.accent, name: "Slash" }),
    label(x, 72 * fs, H * 0.13, W * 0.42, pal.muted),
    txt(72 * fs, H * 0.18, W * 0.46, c.h || "MOVE\nDIFFERENT", 88 * fs, {
      fontFamily: x.fonts.display, fontStyle: "bold", color: pal.ink, lineHeight: 1.0, name: "Heading",
    }),
    txt(72 * fs, H * 0.5, W * 0.36, c.s || "6-week strength block starts Monday. 12 spots only.", 26 * fs, {
      fontFamily: x.fonts.body, color: pal.muted, lineHeight: 1.5, name: "Description",
    }),
    ...ctaPill(x, 72 * fs, H * 0.72, 290 * fs, 74 * fs),
  ];
};

const archProduct: Arch = (x) => {
  const { W, H, fs, pal, c } = x;
  const r = 215 * fs;
  return [
    el({ type: "ellipse", x: W / 2 - r - 26 * fs, y: H * 0.07, width: (r + 26 * fs) * 2, height: (r + 26 * fs) * 2, fill: pal.soft, name: "Ring" }),
    el({ type: "image", x: W / 2 - r, y: H * 0.07 + 26 * fs, width: r * 2, height: r * 2, src: x.photoSrc, name: "Product image", radius: r }),
    label(x, 80 * fs, H * 0.56, W - 160 * fs, pal.muted, "center"),
    txt(80 * fs, H * 0.61, W - 160 * fs, c.h || "Aria Wireless\nHeadphones", 60 * fs, {
      fontFamily: x.fonts.display, fontStyle: "bold", color: pal.ink, align: "center", lineHeight: 1.08, name: "Heading",
    }),
    txt(80 * fs, H * 0.79, W - 160 * fs, c.p || "$129", 84 * fs, {
      fontFamily: x.fonts.display, fontStyle: "bold", color: pal.accent, align: "center", lineHeight: 1, name: "Price",
    }),
    ...ctaPill(x, W / 2, H * 0.9, 300 * fs, 72 * fs, true),
  ];
};

const archAnnounce: Arch = (x) => {
  const { W, H, fs, pal, c } = x;
  const m = 88 * fs;
  return [
    el({ type: "rect", x: 0, y: 0, width: 26 * fs, height: H, fill: pal.accent, name: "Edge bar" }),
    el({ type: "ellipse", x: m, y: m, width: 96 * fs, height: 96 * fs, fill: pal.soft, name: "Logo mark" }),
    txt(m, m + 24 * fs, 96 * fs, (c.a || "FS").slice(0, 2).toUpperCase(), 40 * fs, {
      fontFamily: x.fonts.display, fontStyle: "bold", color: pal.accent, align: "center", name: "Initials",
    }),
    label(x, m, H * 0.26, W - m * 2, pal.muted),
    txt(m, H * 0.31, W - m * 2, c.h || "We're\nHiring", 104 * fs, {
      fontFamily: x.fonts.display, fontStyle: "bold", color: pal.ink, lineHeight: 1.0, name: "Heading",
    }),
    txt(m, H * 0.62, W * 0.66, c.s || "Senior product designer · Remote · Full-time. Help us shape how small brands show up online.", 27 * fs, {
      fontFamily: x.fonts.body, color: pal.muted, lineHeight: 1.55, name: "Description",
    }),
    el({ type: "line", x: m, y: H * 0.82, width: W - m * 2, height: 0, points: [0, 0, W - m * 2, 0], stroke: pal.soft, strokeWidth: 2 * fs, name: "Rule" }),
    txt(m, H * 0.85, W - m * 2, (c.cta || "careers@yourbrand.com").toUpperCase(), 24 * fs, {
      fontFamily: x.fonts.body, fontStyle: "bold", letterSpacing: 3 * fs, color: pal.accent, name: "CTA",
    }),
  ];
};

// ── Trending archetypes ──
const archGrid4: Arch = (x) => {
  const { W, H, fs, pal, c } = x;
  const m = 36 * fs, gap = 16 * fs;
  const cw = (W - m * 2 - gap) / 2;
  const ch = Math.min(cw, (H - m * 2 - gap - 130 * fs) / 2);
  const x2 = m + cw + gap, y2 = m + ch + gap;
  return [
    el({ type: "image", x: m, y: m, width: cw, height: ch, src: x.photoSrc, name: "Photo 1" }),
    el({ type: "image", x: x2, y: m, width: cw, height: ch, src: x.photoSrc, name: "Photo 2" }),
    el({ type: "image", x: m, y: y2, width: cw, height: ch, src: x.photoSrc, name: "Photo 3" }),
    el({ type: "rect", x: x2, y: y2, width: cw, height: ch, fill: pal.accent, name: "Stat panel" }),
    txt(x2, y2 + ch / 2 - 120 * fs, cw, c.o || "2×", 120 * fs, { fontFamily: x.fonts.display, fontStyle: "bold", color: pal.bg, align: "center", lineHeight: 1, name: "Stat number" }),
    txt(x2 + 24 * fs, y2 + ch / 2 + 24 * fs, cw - 48 * fs, c.a || "more saves this week", 26 * fs, { fontFamily: x.fonts.body, color: pal.bg, align: "center", lineHeight: 1.35, name: "Stat caption" }),
    el({ type: "rect", x: m + 18 * fs, y: m + 18 * fs, width: 220 * fs, height: 48 * fs, radius: 24 * fs, fill: pal.bg, opacity: 0.92, name: "Chip" }),
    txt(m + 18 * fs, m + 30 * fs, 220 * fs, ((c.l || "THE EDIT") as string).toUpperCase(), 20 * fs, { fontFamily: x.fonts.body, fontStyle: "bold", letterSpacing: 3 * fs, color: pal.ink, align: "center", name: "Chip text" }),
    txt(m, y2 + ch + 30 * fs, cw * 2 + gap, c.s || "Four frames, one story. Full set on the profile.", 26 * fs, { fontFamily: x.fonts.body, color: pal.ink, lineHeight: 1.4, name: "Caption" }),
  ];
};

const archTicket: Arch = (x) => {
  const { W, H, fs, pal, c } = x;
  const cw = Math.round(W * 0.72), ch = Math.round(H * 0.62);
  const cx = (W - cw) / 2, cy = (H - ch) / 2;
  const notchY = cy + ch * 0.66;
  const bars = [4, 9, 4, 14, 4, 9, 14, 4, 9, 4];
  let bx = cx + cw - 70 * fs - bars.reduce((a, b) => a + b + 8, 0) * fs;
  return [
    el({ type: "ellipse", x: cx - 230 * fs, y: cy - 260 * fs, width: 460 * fs, height: 460 * fs, fill: pal.soft, opacity: 0.55, name: "Halo" }),
    el({ type: "rect", x: cx, y: cy, width: cw, height: ch, radius: 18 * fs, fill: pal.soft, name: "Ticket card", shadow: { color: "rgba(0,0,0,0.3)", blur: 44 * fs, offsetX: 0, offsetY: 16 * fs, opacity: 0.5 } }),
    el({ type: "rect", x: cx + 14 * fs, y: cy + 14 * fs, width: cw - 28 * fs, height: ch - 28 * fs, radius: 12 * fs, fill: "transparent", stroke: pal.ink, strokeWidth: 2.5 * fs, dash: [10 * fs, 8 * fs], name: "Perforation" }),
    el({ type: "ellipse", x: cx - 26 * fs, y: notchY - 26 * fs, width: 52 * fs, height: 52 * fs, fill: pal.bg, name: "Notch L" }),
    el({ type: "ellipse", x: cx + cw - 26 * fs, y: notchY - 26 * fs, width: 52 * fs, height: 52 * fs, fill: pal.bg, name: "Notch R" }),
    txt(cx, cy + 52 * fs, cw, ((c.l || "GOLDEN TICKET") as string).toUpperCase(), 22 * fs, { fontFamily: x.fonts.body, fontStyle: "bold", letterSpacing: 6 * fs, color: pal.muted, align: "center", name: "Label" }),
    txt(cx, cy + ch * 0.15, cw, c.o || "50%", 150 * fs, { fontFamily: x.fonts.display, fontStyle: "bold", color: pal.ink, align: "center", lineHeight: 1, name: "Offer" }),
    txt(cx, cy + ch * 0.15 + 148 * fs, cw, ((c.h || "OFF EVERYTHING") as string).toUpperCase(), 30 * fs, { fontFamily: x.fonts.body, fontStyle: "bold", letterSpacing: 4 * fs, color: pal.accent, align: "center", name: "Offer line" }),
    el({ type: "line", x: cx + 60 * fs, y: notchY, width: cw - 120 * fs, height: 0, points: [0, 0, cw - 120 * fs, 0], stroke: pal.muted, strokeWidth: 2.5 * fs, dash: [2 * fs, 10 * fs], name: "Tear line" }),
    txt(cx + 60 * fs, notchY + 28 * fs, cw * 0.5, ((c.a || "VALID THRU SUNDAY") as string).toUpperCase(), 20 * fs, { fontFamily: x.fonts.body, fontStyle: "bold", letterSpacing: 2 * fs, color: pal.muted, name: "Meta" }),
    ...bars.map((bwi, i) => { const r = el({ type: "rect", x: bx, y: notchY + 24 * fs, width: bwi * fs, height: 58 * fs, fill: pal.ink, name: `Bar ${i + 1}` }); bx += (bwi + 8) * fs; return r; }),
  ];
};

const archBrutal: Arch = (x) => {
  const { W, H, fs, pal, c } = x;
  const m = 30 * fs;
  const lines = (c.h || "MAKE IT\nLOUD").split("\n");
  const out: DesignElement[] = [
    el({ type: "rect", x: m, y: m, width: W - m * 2, height: H - m * 2, fill: "transparent", stroke: pal.ink, strokeWidth: 7 * fs, name: "Frame" }),
  ];
  lines.forEach((ln, i) => {
    const y = H * 0.16 + i * 132 * fs;
    out.push(
      txt(m + 63 * fs, y + 9 * fs, W - 170 * fs, ln.toUpperCase(), 116 * fs, { fontFamily: x.fonts.display, fontStyle: "bold", color: pal.accent, lineHeight: 0.95, name: `Shadow ${i + 1}` }),
      txt(m + 54 * fs, y, W - 170 * fs, ln.toUpperCase(), 116 * fs, { fontFamily: x.fonts.display, fontStyle: "bold", color: pal.ink, lineHeight: 0.95, name: `Word ${i + 1}` }),
    );
  });
  out.push(
    txt(m + 54 * fs, H * 0.64, W * 0.6, c.s || "No filters. No apologies. Just the drop.", 27 * fs, { fontFamily: x.fonts.body, color: pal.ink, lineHeight: 1.45, name: "Caption" }),
    el({ type: "rect", x: W * 0.55, y: H * 0.77, width: 330 * fs, height: 92 * fs, radius: 8 * fs, fill: pal.ink, rotation: -5, name: "Sticker" }),
    txt(W * 0.55, y0sticker(H, fs), 330 * fs, ((c.cta || "GET IT") as string).toUpperCase(), 34 * fs, { fontFamily: x.fonts.display, color: pal.bg, align: "center", letterSpacing: 3 * fs, rotation: -5, name: "Sticker text" }),
    el({ type: "ellipse", x: W - 200 * fs, y: 86 * fs, width: 96 * fs, height: 96 * fs, fill: pal.accent, name: "Dot" }),
  );
  return out;
};
const y0sticker = (H: number, fs: number) => H * 0.77 + 26 * fs;

const archListicle: Arch = (x) => {
  const { W, H, fs, pal, c } = x;
  const m = 84 * fs;
  const out: DesignElement[] = [
    label(x, m, H * 0.09, W - m * 2, pal.muted),
    txt(m, H * 0.13, W - m * 2, c.h || "Three habits of\ntop designers", 66 * fs, { fontFamily: x.fonts.display, fontStyle: "bold", color: pal.ink, lineHeight: 1.06, name: "Heading" }),
  ];
  const titles = [c.t1 || "Steal like a system", c.t2 || "Ship before ready", c.t3 || "Cut one more thing"];
  titles.forEach((t, i) => {
    const y = H * 0.40 + i * H * 0.155;
    out.push(
      el({ type: "ellipse", x: m, y, width: 78 * fs, height: 78 * fs, fill: i === 1 ? pal.ink : pal.accent, name: `Number ${i + 1}` }),
      txt(m, y + 18 * fs, 78 * fs, `0${i + 1}`, 32 * fs, { fontFamily: x.fonts.display, fontStyle: "bold", color: pal.bg, align: "center", lineHeight: 1, name: `Digit ${i + 1}` }),
      txt(m + 118 * fs, y + 6 * fs, W - m * 2 - 118 * fs, t, 34 * fs, { fontFamily: x.fonts.body, fontStyle: "bold", color: pal.ink, lineHeight: 1.3, name: `Tip ${i + 1}` }),
      el({ type: "line", x: m, y: y + 106 * fs, width: W - m * 2, height: 0, points: [0, 0, W - m * 2, 0], stroke: pal.soft, strokeWidth: 2 * fs, name: `Rule ${i + 1}` }),
    );
  });
  out.push(txt(m, H * 0.88, W - m * 2, ((c.cta || "Save this for later") as string).toUpperCase(), 24 * fs, { fontFamily: x.fonts.body, fontStyle: "bold", letterSpacing: 4 * fs, color: pal.accent, name: "CTA" }));
  return out;
};

const archPodcast: Arch = (x) => {
  const { W, H, fs, pal, c } = x;
  const m = 76 * fs;
  const wave = [46, 88, 128, 96, 60, 116, 72, 40];
  return [
    el({ type: "ellipse", x: W * 0.56, y: H * 0.08, width: 440 * fs, height: 440 * fs, fill: pal.soft, name: "Disc" }),
    el({ type: "ellipse", x: W * 0.56 + 120 * fs, y: H * 0.08 + 120 * fs, width: 200 * fs, height: 200 * fs, fill: pal.accent, name: "Hub" }),
    el({ type: "path", x: W * 0.56 + 190 * fs, y: H * 0.08 + 178 * fs, width: 60 * fs, height: 84 * fs, data: "M0 0 L60 42 L0 84 Z", fill: pal.bg, name: "Play" }),
    el({ type: "rect", x: m, y: H * 0.54, width: 190 * fs, height: 52 * fs, radius: 26 * fs, fill: pal.accent, name: "Ep chip" }),
    txt(m, H * 0.54 + 12 * fs, 190 * fs, ((c.l || "EP. 90") as string).toUpperCase(), 24 * fs, { fontFamily: x.fonts.body, fontStyle: "bold", letterSpacing: 2 * fs, color: pal.bg, align: "center", name: "Ep" }),
    txt(m, H * 0.62, W * 0.66, c.h || "Pricing is\npsychology", 72 * fs, { fontFamily: x.fonts.display, fontStyle: "bold", color: pal.ink, lineHeight: 1.02, name: "Heading" }),
    txt(m, H * 0.82, W * 0.55, c.a || "with Maren Holt · 42 min", 26 * fs, { fontFamily: x.fonts.body, color: pal.muted, name: "Host" }),
    ...wave.map((wh, i) => el({ type: "rect", x: W - m - (wave.length - i) * 34 * fs, y: H * 0.88 - wh * fs, width: 16 * fs, height: wh * fs, radius: 8 * fs, fill: i % 2 ? pal.accent : pal.ink, opacity: i % 2 ? 1 : 0.3, name: `Wave ${i + 1}` })),
  ];
};

const archCarousel: Arch = (x) => {
  const { W, H, fs, pal, c } = x;
  const m = 72 * fs, L = 44 * fs;
  return [
    el({ type: "rect", x: m, y: m, width: L, height: 7 * fs, fill: pal.ink, name: "Tick TL-h" }),
    el({ type: "rect", x: m, y: m, width: 7 * fs, height: L, fill: pal.ink, name: "Tick TL-v" }),
    el({ type: "rect", x: W - m - L, y: m, width: L, height: 7 * fs, fill: pal.ink, name: "Tick TR-h" }),
    el({ type: "rect", x: W - m - 7 * fs, y: m, width: 7 * fs, height: L, fill: pal.ink, name: "Tick TR-v" }),
    el({ type: "rect", x: m, y: H - m - 7 * fs, width: L, height: 7 * fs, fill: pal.ink, name: "Tick BL-h" }),
    el({ type: "rect", x: m, y: H - m - L, width: 7 * fs, height: L, fill: pal.ink, name: "Tick BL-v" }),
    el({ type: "rect", x: W - m - L, y: H - m - 7 * fs, width: L, height: 7 * fs, fill: pal.ink, name: "Tick BR-h" }),
    el({ type: "rect", x: W - m - 7 * fs, y: H - m - L, width: 7 * fs, height: L, fill: pal.ink, name: "Tick BR-v" }),
    txt(W * 0.32, H * 0.01, W * 0.62, c.o || "01", 380 * fs, { fontFamily: x.fonts.display, fontStyle: "bold", color: pal.ink, opacity: 0.1, lineHeight: 1, name: "Ghost number" }),
    label(x, m + 30 * fs, H * 0.2, W - m * 2 - 60 * fs, pal.muted),
    txt(m + 30 * fs, H * 0.26, W * 0.74, c.h || "Five design\nmyths, retired", 84 * fs, { fontFamily: x.fonts.display, fontStyle: "bold", color: pal.ink, lineHeight: 1.04, name: "Heading" }),
    txt(m + 30 * fs, H * 0.6, W * 0.6, c.s || "Swipe through — each slide takes under ten seconds.", 28 * fs, { fontFamily: x.fonts.body, color: pal.muted, lineHeight: 1.5, name: "Description" }),
    txt(m, H - 205 * fs, W - m - 120 * fs, ((c.cta || "SWIPE") as string).toUpperCase(), 40 * fs, { fontFamily: x.fonts.display, color: pal.ink, align: "right", letterSpacing: 4 * fs, name: "Swipe" }),
    el({ type: "rect", x: W - m - 88 * fs, y: H - 185 * fs, width: 56 * fs, height: 10 * fs, fill: pal.accent, name: "Arrow shaft" }),
    el({ type: "path", x: W - m - 38 * fs, y: H - 203 * fs, width: 34 * fs, height: 46 * fs, data: "M0 0 L34 23 L0 46 Z", fill: pal.accent, name: "Arrow head" }),
    ...[0, 1, 2, 3, 4].map((i) => el({ type: "ellipse", x: W / 2 - 70 * fs + i * 35 * fs, y: H - 122 * fs, width: (i === 0 ? 18 : 12) * fs, height: (i === 0 ? 18 : 12) * fs, fill: i === 0 ? pal.accent : pal.ink, opacity: i === 0 ? 1 : 0.25, name: `Dot ${i + 1}` })),
  ];
};

const archCountdown: Arch = (x) => {
  const { W, H, fs, pal, c } = x;
  const r = 250 * fs;
  const C = Math.PI * 2 * r;
  const cy = H * 0.32;
  return [
    label(x, 90 * fs, H * 0.09, W - 180 * fs, pal.muted, "center"),
    el({ type: "ellipse", x: W / 2 - r, y: cy - r, width: r * 2, height: r * 2, fill: "transparent", stroke: pal.soft, strokeWidth: 24 * fs, name: "Ring track" }),
    el({ type: "ellipse", x: W / 2 - r, y: cy - r, width: r * 2, height: r * 2, fill: "transparent", stroke: pal.accent, strokeWidth: 24 * fs, dash: [C * 0.72, C], rotation: -90, name: "Ring progress" }),
    txt(W / 2 - r, cy - 118 * fs, r * 2, c.o || "3", 226 * fs, { fontFamily: x.fonts.display, fontStyle: "bold", color: pal.ink, align: "center", lineHeight: 1, name: "Number" }),
    txt(90 * fs, cy + r + 58 * fs, W - 180 * fs, ((c.h || "DAYS LEFT") as string).toUpperCase(), 44 * fs, { fontFamily: x.fonts.body, fontStyle: "bold", letterSpacing: 10 * fs, color: pal.ink, align: "center", name: "Unit" }),
    txt(90 * fs, cy + r + 128 * fs, W - 180 * fs, c.a || "Doors open Friday, 6 PM", 27 * fs, { fontFamily: x.fonts.body, color: pal.muted, align: "center", name: "Meta" }),
    ...ctaPill(x, W / 2, H * 0.87, 320 * fs, 78 * fs, true),
  ];
};

const archCompare: Arch = (x) => {
  const { W, H, fs, pal, c } = x;
  const half = W / 2;
  return [
    el({ type: "image", x: 0, y: 0, width: half, height: H, src: x.photoSrc, name: "Before photo" }),
    el({ type: "rect", x: 0, y: 0, width: half, height: H, fill: "#0a0a0a", opacity: 0.42, name: "Before dim" }),
    el({ type: "image", x: half, y: 0, width: half, height: H, src: x.photoSrc, name: "After photo" }),
    el({ type: "rect", x: half - 4 * fs, y: 0, width: 8 * fs, height: H, fill: "#ffffff", name: "Divider" }),
    el({ type: "rect", x: 36 * fs, y: 42 * fs, width: 190 * fs, height: 54 * fs, radius: 27 * fs, fill: "rgba(10,10,10,0.72)", name: "Before chip" }),
    txt(36 * fs, 55 * fs, 190 * fs, "BEFORE", 24 * fs, { fontFamily: x.fonts.body, fontStyle: "bold", letterSpacing: 3 * fs, color: "#ffffff", align: "center", name: "Before label" }),
    el({ type: "rect", x: half + 30 * fs, y: 42 * fs, width: 170 * fs, height: 54 * fs, radius: 27 * fs, fill: pal.accent, name: "After chip" }),
    txt(half + 30 * fs, 55 * fs, 170 * fs, "AFTER", 24 * fs, { fontFamily: x.fonts.body, fontStyle: "bold", letterSpacing: 3 * fs, color: pal.bg, align: "center", name: "After label" }),
    el({ type: "rect", x: 0, y: H - 190 * fs, width: W, height: 190 * fs, fill: pal.bg, name: "Footer" }),
    txt(72 * fs, H - 158 * fs, W - 380 * fs, c.h || "Same room. New light.", 52 * fs, { fontFamily: x.fonts.display, fontStyle: "bold", color: pal.ink, lineHeight: 1.1, name: "Heading" }),
    txt(72 * fs, H - 86 * fs, W - 380 * fs, ((c.cta || "Book a consult") as string).toUpperCase(), 22 * fs, { fontFamily: x.fonts.body, fontStyle: "bold", letterSpacing: 4 * fs, color: pal.accent, name: "CTA" }),
    el({ type: "ellipse", x: W - 210 * fs, y: H - 148 * fs, width: 96 * fs, height: 96 * fs, fill: pal.soft, name: "Dot" }),
  ];
};

const archMenu: Arch = (x) => {
  const { W, H, fs, pal, c } = x;
  const m = 44 * fs;
  const items = (c.items || "House Special|18; Garden Plate|14; Sunday Roast|26; Espresso|4").split(";").map((s) => s.trim().split("|"));
  const out: DesignElement[] = [
    el({ type: "rect", x: m, y: m, width: W - m * 2, height: H - m * 2, fill: "transparent", stroke: pal.ink, strokeWidth: 2.5 * fs, name: "Outer frame" }),
    el({ type: "rect", x: m + 14 * fs, y: m + 14 * fs, width: W - (m + 14 * fs) * 2, height: H - (m + 14 * fs) * 2, fill: "transparent", stroke: pal.muted, strokeWidth: 1.5 * fs, name: "Inner frame" }),
    txt(0, H * 0.11, W, ((c.l || "EST. 2019") as string).toUpperCase(), 20 * fs, { fontFamily: x.fonts.body, fontStyle: "bold", letterSpacing: 6 * fs, color: pal.muted, align: "center", name: "Est" }),
    txt(60 * fs, H * 0.15, W - 120 * fs, c.h || "The Evening Menu", 60 * fs, { fontFamily: x.fonts.display, fontStyle: "italic", color: pal.ink, align: "center", lineHeight: 1.1, name: "Venue" }),
    el({ type: "line", x: W / 2 - 60 * fs, y: H * 0.265, width: 120 * fs, height: 0, points: [0, 0, 120 * fs, 0], stroke: pal.accent, strokeWidth: 3.5 * fs, name: "Ornament" }),
  ];
  items.slice(0, 4).forEach((it, i) => {
    const y = H * 0.35 + i * H * 0.125;
    out.push(
      txt(110 * fs, y, W * 0.48, it[0] || "Special", 34 * fs, { fontFamily: x.fonts.body, color: pal.ink, name: `Item ${i + 1}` }),
      el({ type: "line", x: W * 0.60, y: y + 26 * fs, width: W * 0.2, height: 0, points: [0, 0, W * 0.2, 0], stroke: pal.muted, strokeWidth: 2 * fs, dash: [2 * fs, 9 * fs], name: `Leader ${i + 1}` }),
      txt(W - 230 * fs, y, 120 * fs, it[1] || "—", 34 * fs, { fontFamily: x.fonts.display, fontStyle: "bold", color: pal.accent, align: "right", name: `Price ${i + 1}` }),
    );
  });
  out.push(txt(90 * fs, H * 0.875, W - 180 * fs, c.s || "Seasonal produce · menu changes weekly", 24 * fs, { fontFamily: x.fonts.body, fontStyle: "italic", color: pal.muted, align: "center", name: "Footer" }));
  return out;
};

const archPoll: Arch = (x) => {
  const { W, H, fs, pal, c } = x;
  const half = H / 2;
  return [
    el({ type: "image", x: 0, y: 0, width: W, height: half, src: x.photoSrc, name: "Option A photo" }),
    el({ type: "rect", x: 0, y: 0, width: W, height: half, fill: "#0a0a0a", opacity: 0.18, name: "A tint" }),
    el({ type: "image", x: 0, y: half, width: W, height: half, src: x.photoSrc, name: "Option B photo" }),
    el({ type: "rect", x: 0, y: half, width: W, height: half, fill: "#0a0a0a", opacity: 0.45, name: "B tint" }),
    el({ type: "rect", x: 44 * fs, y: 150 * fs, width: 170 * fs, height: 60 * fs, radius: 30 * fs, fill: pal.accent, name: "This chip" }),
    txt(44 * fs, 164 * fs, 170 * fs, "THIS", 28 * fs, { fontFamily: x.fonts.display, color: pal.bg, align: "center", letterSpacing: 3 * fs, name: "This label" }),
    el({ type: "rect", x: 44 * fs, y: H - 260 * fs, width: 170 * fs, height: 60 * fs, radius: 30 * fs, fill: "#ffffff", opacity: 0.94, name: "That chip" }),
    txt(44 * fs, H - 246 * fs, 170 * fs, "THAT", 28 * fs, { fontFamily: x.fonts.display, color: "#141517", align: "center", letterSpacing: 3 * fs, name: "That label" }),
    el({ type: "ellipse", x: W / 2 - 105 * fs, y: half - 105 * fs, width: 210 * fs, height: 210 * fs, fill: pal.bg, name: "VS disc", shadow: { color: "rgba(0,0,0,0.3)", blur: 36 * fs, offsetX: 0, offsetY: 10 * fs, opacity: 0.6 } }),
    txt(W / 2 - 105 * fs, half - 40 * fs, 210 * fs, "OR", 60 * fs, { fontFamily: x.fonts.display, fontStyle: "bold", color: pal.ink, align: "center", lineHeight: 1, name: "VS" }),
    txt(90 * fs, H - 150 * fs, W - 180 * fs, c.s || "Reply with your pick — results on Friday.", 26 * fs, { fontFamily: x.fonts.body, color: "#ffffff", align: "center", name: "Caption" }),
  ];
};

const ARCHS: Record<string, Arch> = {
  split: archSplit, fullbleed: archFullbleed, badge: archBadge, minimal: archMinimal,
  editorial: archEditorial, frame: archFrame, quote: archQuote, thumb: archThumb,
  stack: archStack, diagonal: archDiagonal, product: archProduct, announce: archAnnounce,
  grid4: archGrid4, ticket: archTicket, brutal: archBrutal, listicle: archListicle,
  podcast: archPodcast, carousel: archCarousel, countdown: archCountdown, compare: archCompare,
  menu: archMenu, poll: archPoll,
};

// ─── Spec table → 90 templates ─────────────────────────────────────────────
type Spec = [
  name: string, category: string, industry: string, platform: PlatformId,
  arch: keyof typeof ARCHS, pal: number, fp: number,
  c: Record<string, string>, photo?: string, premium?: boolean, portrait?: boolean,
];

const FP: [string, string][] = [
  ["Montserrat", "Inter"], ["Bebas Neue", "Poppins"], ["Playfair Display", "Lora"],
  ["Oswald", "Inter"], ["Poppins", "Inter"], ["Space Grotesk", "Inter"], ["Montserrat", "Lora"],
];

const S: Spec[] = [
  // ── Instagram posts (20) ──
  ["Festive Jewellery Sale", "Sale", "Jewellery", "instagram-post", "badge", 11, 0, { l: "Diwali Collection", h: "FESTIVAL\nJEWELLERY\nSALE", o: "20%", s: "On all gold and polki sets. In-store & online.", cta: "Shop now" }, "jewel"],
  ["Restaurant Chef's Special", "Food", "Restaurant", "instagram-post", "fullbleed", 0, 3, { l: "Chef's Special", h: "Slow-Cooked\nSunday Ragù", s: "Handmade pappardelle, six-hour ragù, pecorino. This weekend only.", cta: "Reserve" }, "burger"],
  ["Bistro Evening Menu", "Food", "Restaurant", "instagram-post", "frame", 1, 2, { l: "Dinner Service", h: "The Evening\nMenu", s: "Five courses · natural wines · candlelight", a: "Fri — Sat · 7 PM" }, "bistro"],
  ["Autumn Fashion Drop", "Fashion", "Fashion", "instagram-post", "split", 7, 6, { l: "New In", h: "The Coat\nSeason", s: "Structured wool, soft knits and the palette of October.", cta: "Explore" }, "fashion"],
  ["Modern Villa Listing", "Business", "Real Estate", "instagram-post", "split", 9, 5, { l: "New Listing", h: "Hillside\nVilla 4B", s: "4 bed · 3 bath · 2,800 sq ft of light-filled living.", cta: "Book a tour" }, "house", true],
  ["6-Week Strength Block", "Fitness", "Fitness", "instagram-post", "diagonal", 12, 3, { l: "Coaching", h: "BUILD\nTHE\nBASE", s: "Six weeks. Three days a week. Real coaching.", cta: "Join now" }, "fitness"],
  ["Island Escape Package", "Travel", "Travel", "instagram-post", "fullbleed", 2, 4, { l: "Winter Escapes", h: "Five Days\nin the Sun", s: "Flights, villa and sunrise kayaking from $899.", cta: "See itinerary" }, "travel"],
  ["Wireless Headphones Launch", "Technology", "Electronics", "instagram-post", "product", 12, 5, { l: "Just Landed", h: "Aria ANC\nHeadphones", p: "$129", s: "40h battery · adaptive ANC", cta: "Pre-order" }, "tech"],
  ["Glow Serum Feature", "Beauty", "Beauty", "instagram-post", "minimal", 10, 2, { l: "Skincare", h: "Glass\nSkin", s: "Niacinamide 10% + zinc. One step, morning and night.", cta: "Add to bag" }, "beauty", true],
  ["Coffee Tasting Saturday", "Events", "Restaurant", "instagram-post", "editorial", 1, 2, { l: "Cupping Session", h: "Notes on\nEthiopia", s: "Six single origins, brewed side by side. Free for members.", a: "Sat · 10 AM", cta: "Save a seat" }],
  ["Webinar: Content Systems", "Education", "Education", "instagram-post", "announce", 9, 5, { l: "Free Webinar", h: "Content\nSystems", s: "How one designer ships a month of posts in a single afternoon.", cta: "Register free", a: "FS" }, undefined, false],
  ["Flash Sale 48 Hours", "Sale", "Fashion", "instagram-post", "badge", 8, 1, { l: "Flash Sale", h: "48 HOUR\nFLASH", o: "40%", s: "Everything online. Ends Sunday midnight.", cta: "Shop the sale" }, "fashion"],
  ["New Arrival Sneaker", "Marketing", "Fashion", "instagram-post", "split", 12, 1, { l: "New Arrival", h: "COURT\nLOW 02", s: "Italian suede, gum sole, numbered run of 500.", cta: "Get yours" }, "fashion", true],
  ["Best Seller Restock", "Marketing", "Beauty", "instagram-post", "minimal", 13, 4, { l: "Back in Stock", h: "The\nRestock", s: "Our best-selling serum returns Thursday, 9 AM sharp.", cta: "Notify me" }, "beauty"],
  ["Monday Motivation Quote", "Quotes", "Personal Branding", "instagram-post", "quote", 3, 2, { q: "Make it work,\nmake it right,\nmake it fast.", a: "Massimo Vignelli" }],
  ["We Are Hiring", "Business", "Technology", "instagram-post", "announce", 10, 5, { l: "Join the team", h: "We're\nHiring", s: "Product engineer · React & Node · Remote-first.", cta: "View roles", a: "FS" }],
  ["Holi Colour Festival", "Festival", "Events", "instagram-post", "badge", 7, 4, { l: "Holi 2026", h: "PLAY IN\nCOLOUR", o: "15%", s: "On organic colours and festive thalis, all week.", cta: "Celebrate" }, "festival"],
  ["Open House Weekend", "Business", "Real Estate", "instagram-post", "frame", 9, 0, { l: "Open House", h: "Walk\nThrough", s: "Maple Grove Residences · Sat & Sun · 11 AM – 4 PM", a: "Sales suite" }, "house"],
  ["Gym Challenge January", "Fitness", "Fitness", "instagram-post", "badge", 2, 3, { l: "30-Day Challenge", h: "JANUARY\nRESET", o: "30", s: "Days. One goal. Coached every step.", cta: "Start free" }, "fitness"],
  ["Jewellery Bestseller", "Sale", "Jewellery", "instagram-post", "split", 0, 2, { l: "Best Seller", h: "The Solitaire\nEdit", s: "Lab-grown brilliance, 18k settings, lifetime warranty.", cta: "Discover" }, "jewel", true],

  // ── Instagram stories (10) ──
  ["Fashion Drop Countdown", "Fashion", "Fashion", "instagram-story", "stack", 12, 1, { l: "Drops Friday", h: "The Winter\nCapsule", o: "3 Days", s: "Turn on reminders — the capsule sells out.", cta: "Remind me" }, "fashion", true],
  ["Today's Menu Story", "Food", "Restaurant", "instagram-story", "fullbleed", 0, 3, { l: "Today Only", h: "Truffle\nGnocchi", s: "Until 10 PM. Swipe up to reserve the last tables.", cta: "Reserve" }, "burger"],
  ["Trainer Tip Story", "Fitness", "Fitness", "instagram-story", "diagonal", 2, 3, { l: "Coach's Tip", h: "SLOW\nTEMPO\nWINS", s: "3 seconds down. Feel every rep.", cta: "Try it" }, "fitness"],
  ["Travel Swipe Up", "Travel", "Travel", "instagram-story", "fullbleed", 2, 4, { l: "Hidden Beach", h: "Railay\nMornings", s: "The longtail leaves at 7. Swipe up for the route.", cta: "Swipe up" }, "travel"],
  ["Sale Ends Tonight", "Sale", "Fashion", "instagram-story", "badge", 8, 1, { l: "Last Chance", h: "ENDS\nTONIGHT", o: "40%", s: "Code FLASH40 at checkout. Midnight cutoff.", cta: "Use code" }],
  ["New Collection Story", "Fashion", "Fashion", "instagram-story", "stack", 1, 6, { l: "Just In", h: "Linen\nSeason", o: "New", s: "Breathable weaves in eight shades of sand.", cta: "Shop new" }, "fashion"],
  ["Event Tonight Story", "Events", "Events", "instagram-story", "fullbleed", 11, 2, { l: "Live Tonight", h: "Jazz After\nDark", s: "Doors 8 PM. No cover before 9.", cta: "Get directions" }, "bistro"],
  ["Skincare Routine Story", "Beauty", "Beauty", "instagram-story", "product", 10, 4, { l: "3-Step Glow", h: "Cleanse.\nSerum. Rest.", p: "$58", s: "The full routine, one bundle.", cta: "Shop routine" }, "beauty"],
  ["Tech Unboxing Story", "Technology", "Electronics", "instagram-story", "stack", 12, 5, { l: "Unboxed", h: "Aria ANC\nIn Hand", o: "New", s: "Full review on the channel Friday.", cta: "Watch" }, "tech"],
  ["Daily Affirmation", "Quotes", "Personal Branding", "instagram-story", "quote", 3, 2, { q: "Small steps,\ntaken daily,\nbecome\nmountains.", a: "Studio Notes" }],

  // ── Business (10) ──
  ["Corporate Milestone", "Business", "Business", "instagram-post", "minimal", 9, 5, { l: "Company News", h: "10 Years\nof Craft", s: "A decade of partnerships, products and people. Thank you.", cta: "Read the letter" }, undefined, false],
  ["Product Launch Keynote", "Business", "Technology", "facebook-post", "split", 12, 5, { l: "Launch Day", h: "MEET\nNOVA X1", s: "Our fastest platform ever. Live demo, Thursday 10 AM PT.", cta: "Watch live" }, "tech"],
  ["Company Announcement", "Business", "Business", "linkedin-post", "announce", 9, 5, { l: "Announcement", h: "Series A,\nAnnounced", s: "We've raised $12M to bring professional design tools to every small brand.", cta: "Read more", a: "FS" }, undefined, true],
  ["Service Advertisement", "Business", "Finance", "facebook-post", "minimal", 10, 0, { l: "Advisory", h: "Clear\nNumbers", s: "Quarterly bookkeeping, forecasting and a human on the phone.", cta: "Book a call" }],
  ["Hiring: Designer", "Business", "Technology", "linkedin-post", "announce", 3, 5, { l: "Open Role", h: "Senior\nDesigner", s: "Own the visual system behind tools used by 40,000 makers.", cta: "Apply today", a: "FS" }],
  ["Achievement: Award", "Business", "Business", "instagram-post", "editorial", 0, 2, { l: "Recognition", h: "Design\nTeam of\nthe Year", s: "Honoured by the Creative Guild, 2025. Onwards.", a: "With gratitude" }, undefined, true],
  ["B2B Webinar Invite", "Business", "Education", "linkedin-post", "announce", 9, 4, { l: "Webinar · Free", h: "Pipeline\nWithout\nAds", s: "45 minutes on outbound that doesn't feel outbound.", cta: "Save my seat", a: "FS" }],
  ["Team Culture Post", "Personal Branding", "Business", "instagram-post", "frame", 1, 6, { l: "Inside the Studio", h: "How We\nShip", s: "Critique Fridays, deep-work mornings, no-meeting Wednesdays.", a: "Studio culture" }, "bistro"],
  ["Client Testimonial", "Business", "Business", "facebook-post", "quote", 9, 2, { q: "They rebuilt our brand\nin three weeks. Bookings\ndoubled by month two.", a: "Maren Holt · Founder, Holt & Co" }],
  ["Conference Speaker", "Events", "Education", "instagram-post", "split", 2, 5, { l: "Config 2026", h: "DESIGN\nAT SCALE", s: "Main stage · March 14 · Lisbon. Tickets on sale now.", cta: "Get tickets" }, "travel", true],

  // ── Sale (10) ──
  ["Mega Clearance Sale", "Sale", "Fashion", "instagram-post", "badge", 13, 1, { l: "Clearance", h: "MEGA\nCLEAR-\nANCE", o: "70%", s: "Final reductions. When it's gone, it's gone.", cta: "Shop now" }, "fashion"],
  ["Black Friday Early Access", "Sale", "Electronics", "instagram-post", "split", 12, 1, { l: "Early Access", h: "BLACK\nFRIDAY", s: "Members shop 24 hours early. Up to 50% site-wide.", cta: "Unlock deals" }, "tech", true],
  ["Flash Sale Friday", "Sale", "Beauty", "instagram-post", "minimal", 8, 1, { l: "Flash · Friday", h: "24\nHOURS", s: "Everything. No codes. Prices already dropped.", cta: "Shop Friday" }],
  ["Buy One Get One", "Sale", "Restaurant", "instagram-post", "fullbleed", 0, 3, { l: "BOGO Tuesdays", h: "Buy One\nGet One", s: "All mains, every Tuesday, dine-in only.", cta: "Claim it" }, "burger"],
  ["Mid-Season Markdown", "Sale", "Fashion", "instagram-portrait", "stack", 7, 6, { l: "Mid-Season", h: "Marked\nDown", o: "-35%", s: "Coats, knitwear and everything between.", cta: "Browse" }, "fashion"],
  ["Members Loyalty Reward", "Sale", "Beauty", "instagram-post", "editorial", 11, 2, { l: "Members Only", h: "Double\nPoints\nWeek", s: "Every purchase counts twice, through Sunday.", a: "Loyalty circle" }, "beauty"],
  ["Last Chance Weekend", "Sale", "Furniture", "instagram-post", "badge", 5, 1, { l: "Last Chance", h: "FINAL\nWEEKEND", o: "50%", s: "Floor samples and open-box, half price.", cta: "Visit us" }],
  ["Independence Day Offer", "Sale", "Events", "instagram-post", "badge", 2, 3, { l: "Aug 15 Special", h: "FREEDOM\nSALE", o: "25%", s: "On everything handmade at home. Jai Hind.", cta: "Celebrate" }, "festival"],
  ["Weekend Deal Stack", "Sale", "Electronics", "facebook-post", "split", 7, 5, { l: "Weekend Stack", h: "DEAL\nSTACK", s: "Bundle audio + accessories, save an extra 15%.", cta: "Build a bundle" }, "tech"],
  ["New Year Blowout", "Sale", "Fashion", "instagram-story", "badge", 11, 1, { l: "Jan 1 – 7", h: "NEW YEAR\nBLOWOUT", o: "60%", s: "The biggest markdowns of the year. One week.", cta: "Shop now" }, "fashion", true],

  // ── Product advertisements (10) ──
  ["Smartphone Reveal", "Marketing", "Electronics", "instagram-post", "split", 12, 5, { l: "Reveal", h: "PIXEL\nPERFECT", s: "200MP sensor. Titanium frame. All-day everything.", cta: "Pre-order" }, "tech", true],
  ["Artisan Coffee Beans", "Marketing", "Restaurant", "instagram-post", "frame", 1, 2, { l: "Roasted Weekly", h: "Huila,\nColombia", s: "Washed process · notes of panela, plum and cacao.", a: "250g · $18" }],
  ["Smartwatch Series 5", "Marketing", "Electronics", "instagram-portrait", "product", 9, 5, { l: "Series 5", h: "Time,\nMeasured\nBetter", p: "$249", s: "ECG · 14-day battery · sapphire glass", cta: "Buy now" }, "tech"],
  ["Sofa Collection", "Marketing", "Furniture", "pinterest-pin", "stack", 1, 6, { l: "Living Room", h: "The Cloud\nSofa", o: "New", s: "Eight fabrics, feather-wrapped cushions, made to order.", cta: "Configure" }, "house", true],
  ["Camera Field Review", "Marketing", "Electronics", "youtube-thumbnail", "thumb", 12, 1, { l: "Review", h: "IS IT\nWORTH\n$2499?", s: "30 days with the X-T6 in the Himalayas", cta: "" }, "travel"],
  ["Perfume Launch", "Marketing", "Beauty", "instagram-post", "editorial", 0, 2, { l: "Eau de Parfum", h: "Noir\nVétiver", s: "Smoked vetiver, black pepper, a whisper of iris.", a: "50ml · $96" }, "beauty", true],
  ["Electric Scooter", "Marketing", "Automotive", "instagram-post", "diagonal", 12, 3, { l: "Urban Mobility", h: "GLIDE\nCITY 2", s: "45 km range. Folds in three seconds.", cta: "Ride it" }, "tech"],
  ["Organic Juice Cleanse", "Marketing", "Food", "instagram-post", "minimal", 10, 4, { l: "Cold-Pressed", h: "Three\nDays,\nSix Greens", s: "Pressed each morning, delivered before 8 AM.", cta: "Start Monday" }],
  ["Desk Lamp Studio", "Marketing", "Furniture", "pinterest-pin", "product", 3, 5, { l: "Workspace", h: "Halo Task\nLamp", p: "$89", s: "2700–5000K · flicker-free · walnut base", cta: "Add to cart" }, "beauty"],
  ["Running Shoe Carbon", "Marketing", "Fitness", "instagram-post", "split", 13, 3, { l: "Race Day", h: "CARBON\nFLY 3", s: "212 grams. Plates, foam and a personal best waiting.", cta: "Lace up" }, "fitness", true],

  // ── Quotes (10) ──
  ["Vignelli Discipline", "Quotes", "Personal Branding", "instagram-post", "quote", 3, 2, { q: "Design is\nintelligence\nmade visible.", a: "Alina Wheeler" }],
  ["Mies Minimal Quote", "Quotes", "Personal Branding", "instagram-post", "quote", 12, 2, { q: "Less is\nmore.", a: "Ludwig Mies van der Rohe" }],
  ["Ship Daily Quote", "Quotes", "Personal Branding", "instagram-post", "minimal", 10, 5, { l: "Studio Notes", h: "Ship\nDaily", s: "Momentum beats inspiration. Post the imperfect thing.", cta: "@yourbrand" }],
  ["Dieter Rams Order", "Quotes", "Personal Branding", "instagram-post", "editorial", 9, 2, { l: "Principle 05", h: "Good design\nis unobtrusive", s: "Products fulfilling a purpose are like tools: neither decorative nor art.", a: "Dieter Rams" }],
  ["Maya Angelou Story Quote", "Quotes", "Personal Branding", "instagram-story", "quote", 11, 2, { q: "People will forget\nwhat you said, but\nnever how you made\nthem feel.", a: "Maya Angelou" }, undefined, true],
  ["Consistency Quote", "Quotes", "Personal Branding", "instagram-post", "badge", 2, 4, { l: "Reminder", h: "CONSIST-\nENCY", o: "1%", s: "Better every day compounds into unrecognisable.", cta: "Keep going" }],
  ["Seneca Time Quote", "Quotes", "Personal Branding", "instagram-post", "quote", 0, 2, { q: "It is not that we have\na short time to live,\nbut that we waste\nmuch of it.", a: "Seneca" }],
  ["Make It Simple", "Quotes", "Personal Branding", "facebook-post", "minimal", 3, 5, { l: "Principle", h: "Simple,\nthen\nmemorable", s: "Cut until it almost breaks. Then stop.", cta: "Save this" }],
  ["Audrey Style Quote", "Quotes", "Fashion", "instagram-post", "editorial", 7, 2, { l: "On Elegance", h: "Elegance is\nrefusal", s: "The hardest line in design is the one you remove.", a: "After Coco Chanel" }],
  ["Pinterest Pin Quote", "Quotes", "Personal Branding", "pinterest-pin", "quote", 10, 2, { q: "Your brand is what\npeople say when\nyou leave\nthe room.", a: "Jeff Bezos" }, undefined, true],

  // ── Festival (10) ──
  ["Diwali Lights Greeting", "Festival", "Events", "instagram-post", "fullbleed", 11, 2, { l: "Shubh Deepavali", h: "May Light\nFind You", s: "Wishing you a season of warmth, sweets and new beginnings.", cta: "From our family" }, "festival"],
  ["Holi Colour Splash", "Festival", "Events", "instagram-post", "badge", 8, 4, { l: "Holi Hai", h: "COLOUR\nBURST", o: "HOLI", s: "Organic gulal kits at the studio all week.", cta: "Grab yours" }, "festival"],
  ["Eid Mubarak Card", "Festival", "Events", "instagram-post", "editorial", 2, 2, { l: "Eid ul-Fitr", h: "Eid\nMubarak", s: "May your homes be bright and your tables full.", a: "With love" }],
  ["Christmas Market Night", "Festival", "Events", "instagram-post", "frame", 11, 2, { l: "Dec 14 – 24", h: "The Winter\nMarket", s: "Mulled wine, makers and music under the lights.", a: "Town Square · 5 PM" }, "festival", true],
  ["New Year Countdown", "Festival", "Events", "instagram-story", "stack", 12, 1, { l: "Dec 31", h: "Midnight\nCountdown", o: "NYE", s: "Rooftop · DJ · fireworks at 12. Tickets almost gone.", cta: "Get tickets" }, "festival"],
  ["Independence Day Tricolor", "Festival", "Events", "instagram-post", "minimal", 10, 3, { l: "August 15", h: "Freedom\nin Every\nFrame", s: "Celebrating 79 years of the republic. Jai Hind.", cta: "#IndependenceDay" }],
  ["Republic Day Salute", "Festival", "Events", "instagram-post", "announce", 9, 3, { l: "January 26", h: "We, The\nPeople", s: "A salute to the constitution and the crafts it protects.", cta: "Jai Hind", a: "FS" }],
  ["Birthday Bash Invite", "Events", "Events", "instagram-post", "badge", 13, 1, { l: "You're Invited", h: "AARAV\nTURNS\nFIVE", o: "5!", s: "Saturday, 4 PM · Sprouts Play Cafe · RSVP by Wed.", cta: "RSVP" }],
  ["Wedding Save the Date", "Events", "Events", "instagram-post", "editorial", 1, 2, { l: "Save the Date", h: "Ishaan\nweds\nMeera", s: "November 21, 2026 · Udaipur. Formal invitation to follow.", a: "The families" }, undefined, true],
  ["Anniversary Dinner", "Events", "Events", "facebook-post", "fullbleed", 11, 2, { l: "25 Years", h: "Silver,\nCelebrated", s: "Join us for a five-course thank-you, on the house.", cta: "Reserve" }, "bistro"],

  // ── YouTube thumbnails (10) ──
  ["Tech Review Thumb", "Technology", "Electronics", "youtube-thumbnail", "thumb", 12, 1, { l: "Review", h: "DON'T\nBUY YET", s: "The truth after 60 days", cta: "" }, "tech"],
  ["Travel Vlog Thumb", "Travel", "Travel", "youtube-thumbnail", "thumb", 2, 1, { l: "Ep. 4", h: "$20 A DAY\nIN BALI", s: "Full budget breakdown inside", cta: "" }, "travel"],
  ["Recipe Video Thumb", "Food", "Restaurant", "youtube-thumbnail", "thumb", 13, 1, { l: "Recipe", h: "15-MIN\nRAMEN", s: "Better than takeout. Promise.", cta: "" }, "burger"],
  ["Workout Thumb", "Fitness", "Fitness", "youtube-thumbnail", "thumb", 0, 1, { l: "Follow Along", h: "20-MIN\nCORE", s: "No equipment needed", cta: "" }, "fitness"],
  ["Finance Explainer", "Education", "Finance", "youtube-thumbnail", "thumb", 7, 1, { l: "Money 101", h: "INDEX\nFUNDS\nEXPLAINED", s: "In 9 honest minutes", cta: "" }, "tech", true],
  ["Design Tutorial", "Education", "Education", "youtube-thumbnail", "thumb", 3, 1, { l: "Tutorial", h: "THUMBNAILS\nTHAT POP", s: "My full workflow", cta: "" }, "beauty"],
  ["Real Estate Tour", "Real Estate", "Real Estate", "youtube-thumbnail", "thumb", 9, 1, { l: "Home Tour", h: "$2.4M\nHILLHOUSE", s: "Worth it? Full walkthrough", cta: "" }, "house", true],
  ["Podcast Episode", "Events", "Business", "youtube-thumbnail", "thumb", 11, 1, { l: "Podcast 88", h: "PRICING\nIS\nPSYCHOLOGY", s: "With Maren Holt", cta: "" }, "bistro"],
  ["Gaming Setup", "Technology", "Electronics", "youtube-thumbnail", "thumb", 5, 1, { l: "Setup", h: "DREAM\nSTUDIO\n2026", s: "Every single item listed", cta: "" }, "tech"],
  ["Top 10 List", "Marketing", "Education", "youtube-thumbnail", "thumb", 8, 1, { l: "Top 10", h: "CAMERAS\nRANKED", s: "Budget to flagship", cta: "" }, "tech"],

  // ── Trending drop: grids, tickets, brutal, listicles, podcasts, carousels, countdowns, comparisons, menus, polls (30) ──
  ["Lookbook: Four Frames", "Fashion", "Fashion", "instagram-post", "grid4", 7, 6, { l: "The Edit", o: "48", a: "pieces in the capsule", s: "Four frames, one mood. Full lookbook at the link." }, "fashion"],
  ["Chef's Picks Grid", "Food", "Restaurant", "instagram-post", "grid4", 0, 3, { l: "Chef's Picks", o: "4.9", a: "average plate rating", s: "This week's most-ordered, side by side." }, "burger"],
  ["Travel Postcards", "Travel", "Travel", "pinterest-pin", "grid4", 2, 4, { l: "Postcards", o: "12", a: "stops, one island", s: "Save this route for your next escape." }, "travel", true],
  ["Golden Ticket Drop", "Sale", "Fashion", "instagram-post", "ticket", 11, 1, { l: "Members Only", o: "50%", h: "OFF EVERYTHING", a: "VALID THRU SUNDAY" }, "fashion", true],
  ["Admit One: Live Show", "Events", "Events", "instagram-post", "ticket", 5, 1, { l: "Admit One", o: "LIVE", h: "JAZZ AFTER DARK", a: "SAT · DOORS 8 PM" }, "bistro"],
  ["First Order Coupon", "Sale", "Restaurant", "facebook-post", "ticket", 13, 4, { l: "Welcome Treat", o: "20%", h: "OFF FIRST ORDER", a: "NEW CUSTOMERS ONLY" }, "burger"],
  ["Loud Drop Poster", "Marketing", "Fashion", "instagram-post", "brutal", 8, 1, { h: "MAKE IT\nLOUD", s: "The summer drop lands Friday. Zero restocks.", cta: "Get it" }, "fashion"],
  ["No Excuses Poster", "Fitness", "Fitness", "instagram-post", "brutal", 12, 3, { h: "SHOW UP\nAGAIN", s: "Motivation fades. The 6 AM class doesn't.", cta: "Book it" }, "fitness"],
  ["Everything Must Go", "Sale", "Furniture", "instagram-post", "brutal", 13, 1, { h: "EVERY-\nTHING GOES", s: "Floor samples, open box, final markdowns.", cta: "This week" }],
  ["3 Habits of Top Designers", "Education", "Education", "instagram-post", "listicle", 9, 5, { l: "Studio Notes", h: "Three habits of\ntop designers", t1: "Steal like a system", t2: "Ship before ready", t3: "Cut one more thing", cta: "Save this" }],
  ["5-Minute Morning Reset", "Fitness", "Fitness", "instagram-post", "listicle", 10, 4, { l: "Daily Reset", h: "A five-minute\nmorning reset", t1: "Water before caffeine", t2: "Ten slow breaths", t3: "One line of intention", cta: "Try tomorrow" }],
  ["Money Rules to Live By", "Education", "Finance", "instagram-post", "listicle", 0, 2, { l: "Money 101", h: "Three rules that\nbeat any hack", t1: "Pay yourself on day one", t2: "Automate the boring parts", t3: "Never negotiate scared", cta: "Share this" }, undefined, true],
  ["Podcast Episode 90", "Events", "Business", "instagram-post", "podcast", 12, 5, { l: "Ep. 90", h: "Pricing is\npsychology", a: "with Maren Holt · 42 min", cta: "Listen" }, undefined, true],
  ["Audio Series Launch", "Business", "Technology", "instagram-post", "podcast", 2, 0, { l: "New Series", h: "Shipping\nin Public", a: "eight episodes · weekly", cta: "Subscribe" }],
  ["Carousel Cover: Design Myths", "Education", "Education", "instagram-post", "carousel", 3, 5, { l: "Carousel · 6 slides", o: "01", h: "Five design\nmyths, retired", s: "Swipe through — each slide takes under ten seconds.", cta: "SWIPE" }, undefined, true],
  ["Carousel: Morning Routine", "Fitness", "Fitness", "instagram-post", "carousel", 10, 4, { l: "Wellness · 5 slides", o: "01", h: "A calmer\n7 AM", s: "Small inputs, compounding mornings. Swipe for the stack.", cta: "SWIPE" }],
  ["Carousel: Brand Voice", "Personal Branding", "Business", "instagram-post", "carousel", 9, 5, { l: "Branding · 7 slides", o: "01", h: "Sound like\nyourself", s: "A practical voice audit you can run this afternoon.", cta: "SWIPE" }],
  ["Launch Countdown", "Marketing", "Electronics", "instagram-post", "countdown", 12, 5, { l: "Launch Week", o: "3", h: "DAYS LEFT", a: "Aria ANC · Thursday 10 AM", cta: "Remind me" }, "tech"],
  ["Sale Ends In…", "Sale", "Beauty", "instagram-story", "countdown", 8, 1, { l: "Final Stretch", o: "1", h: "DAY LEFT", a: "Code GLOW ends at midnight", cta: "Use code" }, "beauty"],
  ["Event Countdown", "Events", "Events", "instagram-post", "countdown", 5, 2, { l: "Save the Evening", o: "6", h: "DAYS TO GO", a: "Jazz After Dark · Sat 8 PM", cta: "Get tickets" }, "bistro"],
  ["Before & After: Renovation", "Business", "Real Estate", "instagram-post", "compare", 9, 0, { h: "Same room. New light.", cta: "Book a consult" }, "house", true],
  ["Glow Up: 30 Days", "Fitness", "Fitness", "instagram-post", "compare", 2, 3, { h: "Thirty days, zero shortcuts.", cta: "Start yours" }, "fitness"],
  ["Skin Reset Results", "Beauty", "Beauty", "instagram-post", "compare", 10, 4, { h: "Week one vs. week six.", cta: "Shop the serum" }, "beauty"],
  ["Dinner Menu Board", "Food", "Restaurant", "instagram-post", "menu", 0, 2, { l: "Est. 2019", h: "The Evening Menu", items: "Truffle Gnocchi|24; Wood-Fired Ribeye|42; Charred Leeks|16; Basque Cheesecake|12", s: "Seasonal produce · menu changes weekly" }, undefined, true],
  ["Cafe Price List", "Food", "Restaurant", "instagram-post", "menu", 1, 2, { l: "Roasted Weekly", h: "The Coffee List", items: "Espresso|3.5; Flat White|4.5; Pour Over|6; Cold Brew|5.5", s: "Single origins rotate every Monday" }],
  ["Cocktail Hour Menu", "Food", "Restaurant", "instagram-story", "menu", 11, 2, { l: "5 – 7 PM", h: "Cocktail Hour", items: "Negroni Classico|12; Smoked Paloma|14; Garden Spritz|11; Zero Proof|8", s: "Two-for-one on classics, every weekday" }],
  ["This or That: Travel", "Travel", "Travel", "instagram-story", "poll", 2, 4, { s: "Reply with your pick — results on Friday." }, "travel"],
  ["This or That: Sneakers", "Fashion", "Fashion", "instagram-story", "poll", 12, 1, { s: "Left or right? Drop your vote below." }, "fashion"],
  ["Reel Cover: Bold Title", "Fitness", "Fitness", "reel-cover", "thumb", 13, 1, { l: "Reel", h: "5 FORM\nFIXES\nYOU NEED", s: "Save this one", cta: "" }, "fitness"],
  ["Reel Cover: Tutorial", "Beauty", "Beauty", "reel-cover", "thumb", 10, 4, { l: "Tutorial", h: "GLASS SKIN\nIN 4\nSTEPS", s: "Full routine inside", cta: "" }, "beauty"],
];

// ─── Build templates ────────────────────────────────────────────────────────
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const TEMPLATES: DesignTemplate[] = S.map((row, i) => {
  const [name, category, industry, platform, arch, palIdx, fpIdx, c, photoId, premium, portrait] = row;
  const plat = platformById(platform)!;
  const W = portrait ? 1080 : plat.width;
  const H = portrait ? 1350 : plat.height;
  const pal = PALETTES[palIdx % PALETTES.length];
  const [display, body] = FP[fpIdx % FP.length];
  const ctx: Ctx = {
    W, H, fs: W / 1080, pal, fonts: { display, body }, c,
    photoSrc: ph(photoId),
  };
  const background: Background = { type: "solid", color: pal.bg };
  const elements = ARCHS[arch](ctx);
  return {
    id: `tpl-${slug(name)}-${i}`,
    name, category, industry, platform, width: W, height: H,
    premium: !!premium,
    tags: [name, category, industry, platform.replace(/-/g, " "), ...Object.values(c)]
      .join(" ").toLowerCase().split(/[^a-z0-9%]+/).filter((t) => t.length > 2),
    design: { width: W, height: H, background, elements },
  };
});

export const blankDoc = (width: number, height: number): DesignDocument => ({
  width, height,
  background: { type: "solid", color: "#ffffff" },
  elements: [],
});

// ─── Built-in suggestion engine (local, no external AI) ────────────────────
const INDUSTRIES_RX: [RegExp, string][] = [
  [/jewel|gold|diamond/i, "Jewellery"], [/restaurant|food|cafe|caf[ée]|bistro|kitchen|pizza|burger/i, "Restaurant"],
  [/fashion|clothing|boutique|apparel|dress/i, "Fashion"], [/real\s?estate|property|villa|apartment|flat/i, "Real Estate"],
  [/fitness|gym|yoga|workout/i, "Fitness"], [/travel|tour|trip|holiday|hotel/i, "Travel"],
  [/tech|electronic|gadget|phone|audio/i, "Technology"], [/beauty|skincare|salon|cosmetic/i, "Beauty"],
  [/school|course|education|academy|class/i, "Education"], [/coffee/i, "Restaurant"],
];
const EVENTS_RX: [RegExp, string][] = [
  [/diwali|deepavali/i, "Diwali"], [/holi/i, "Holi"], [/eid/i, "Eid"], [/christmas|xmas/i, "Christmas"],
  [/new year/i, "New Year"], [/independence/i, "Independence Day"], [/republic/i, "Republic Day"],
  [/birthday/i, "Birthday"], [/wedding/i, "Wedding"], [/anniversary/i, "Anniversary"],
  [/festival|festive/i, "Festival"],
];

export function generateSuggestion(prompt: string): AISuggestion {
  const pct = prompt.match(/(\d{1,2})\s*(%|percent|off)/i);
  const industry = INDUSTRIES_RX.find(([r]) => r.test(prompt))?.[1] || "Business";
  const event = EVENTS_RX.find(([r]) => r.test(prompt))?.[1];
  const isSale = /sale|discount|offer|deal/i.test(prompt) || !!pct;
  const isLaunch = /launch|new|announce|opening|introducing/i.test(prompt) && !isSale;

  const industryUpper = industry === "Business" ? "SEASON" : industry.toUpperCase();
  const headline = isSale
    ? `${event ? event.toUpperCase() : "FESTIVAL"} ${industryUpper} SALE`
    : isLaunch ? `THE NEW ${industryUpper}\nHAS ARRIVED` : `${industryUpper}\nMADE MEMORABLE`;
  const offer = pct ? `${pct[1]}% OFF` : isSale ? "SPECIAL OFFER" : undefined;
  const subheadline = isSale
    ? `${event ? event + " specials" : "Limited-time savings"} on everything in-store and online. ${pct ? `Take ${pct[1]}% off your favourites, ` : ""}while stocks last.`
    : isLaunch
      ? "Be the first to experience it — available this week, in-store and online."
      : "Crafted with care, delivered with consistency. Visit us this week.";
  const cta = isSale ? "SHOP NOW" : isLaunch ? "BE FIRST" : "VISIT US";
  const palIdx = { Jewellery: 11, Restaurant: 0, Fashion: 7, "Real Estate": 9, Fitness: 2, Travel: 2, Technology: 12, Beauty: 10, Education: 9 }[industry] ?? 3;
  const palette = PALETTES[palIdx];
  const layout = isSale ? "badge — bold circular offer at centre" : isLaunch ? "split — product photo left, story right" : "editorial — framed, typographic";
  const caption = `${headline.replace(/\n/g, " ")}${offer ? ` — ${offer}.` : "."} ${subheadline} ${cta.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase())}.`;
  const hashtags = [industry.toLowerCase(), event?.toLowerCase(), "sale", "offer", "smallbusiness", "shoplocal", "design", "socialmedia"]
    .filter(Boolean).slice(0, 6).map((t) => "#" + t!.replace(/\s+/g, ""));
  return { headline, subheadline, offer, cta, palette: { ...palette }, layout, caption, hashtags };
}

const TONE_WORDS: Record<string, [string, string, string]> = {
  Professional: ["Reliable results,", "Built on expertise and process.", "Book a consultation"],
  Luxury: ["Rare by design,", "Crafted in limited numbers, finished by hand.", "Request an appointment"],
  Friendly: ["Hey, good news —", "Made with the kind of care you can feel.", "Come say hi"],
  Minimal: ["Simply,", "Fewer, better things.", "Explore"],
  Bold: ["STOP SCROLLING.", "Loud where it counts, quiet where it matters.", "DO IT NOW"],
  Urgent: ["Final hours —", "When the timer hits zero, this is gone.", "Claim it before midnight"],
};

export function generateContent(kind: string, topic: string, tone: string): string[] {
  const [a, b, c] = TONE_WORDS[tone] || TONE_WORDS.Professional;
  const t = topic.trim() || "your brand";
  switch (kind) {
    case "headline": return [`${a} ${t}`, `${t.toUpperCase()}, REDEFINED`, `THIS IS ${t.toUpperCase()}`];
    case "caption": return [
      `${a} ${t} is here. ${b} Link in bio.`,
      `We made ${t} for people who notice details. ${b}`,
      `${t.toUpperCase()} — dropping this week. ${c}.`,
    ];
    case "cta": return [c, c.toUpperCase(), tone === "Urgent" ? "DON'T MISS OUT" : "LEARN MORE"];
    case "description": return [
      `${a} ${t} pairs considered design with honest materials. ${b}`,
      `${t}: designed to be used daily and kept for years. ${b}`,
      `Meet ${t}. ${b} Available in-store and online.`,
    ];
    case "hashtags": {
      const base = t.toLowerCase().split(/\s+/).filter(Boolean);
      return [
        base.map((w) => "#" + w).join(" ") + " #newdrop #shopsmall",
        "#" + base.join("") + " #design #quality #launch",
        base.map((w) => "#" + w).join(" ") + " #madebysmallbrands #discover",
      ];
    }
    case "rewrite": return [`${a} ${t}.`, `${t} — ${b.toLowerCase()}`, `${t.toUpperCase()}. ${c}.`];
    default: return [a, b, c];
  }
}
