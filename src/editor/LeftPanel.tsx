import { useMemo, useRef, useState } from "react";
import { ArrowUp, ChevronRight, Copy, Eye, EyeOff, Image as ImageIcon, LayoutTemplate, Layers, Lock, Unlock, Paintbrush, Palette, Shapes, Trash2, Type, Upload } from "lucide-react";
import DocSVG from "../components/DocSVG";
import { Badge, Button, IconBtn, SearchInput } from "../components/ui";
import { FONTS, GRADIENT_PRESETS, SOLID_SWATCHES, STOCK_IMAGES, TEXT_PRESETS } from "../lib/constants";
import { TEMPLATES } from "../lib/templateFactory";
import type { Background, DesignElement, DesignTemplate } from "../types";
import { useAppStore, useAssetsStore, useBrandStore, useEditorStore } from "../stores";
import { cx, processUploadFile, uid } from "../lib/utils";

type Tab = "templates" | "elements" | "text" | "uploads" | "images" | "background" | "brand" | "layers";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "templates", label: "Templates", icon: <LayoutTemplate size={17} /> },
  { id: "elements", label: "Elements", icon: <Shapes size={17} /> },
  { id: "text", label: "Text", icon: <Type size={17} /> },
  { id: "uploads", label: "Uploads", icon: <Upload size={17} /> },
  { id: "images", label: "Images", icon: <ImageIcon size={17} /> },
  { id: "background", label: "Background", icon: <Paintbrush size={17} /> },
  { id: "brand", label: "Brand", icon: <Palette size={17} /> },
  { id: "layers", label: "Layers", icon: <Layers size={17} /> },
];

// ─── Element library ────────────────────────────────────────────────────────
interface LibItem { label: string; cat: string; preview: React.ReactNode; make: () => DesignElement[]; }
const base = (p: Partial<DesignElement> & { type: DesignElement["type"] }): DesignElement => ({
  id: uid("el"), name: "Element", x: 0, y: 0, width: 100, height: 100,
  rotation: 0, opacity: 1, visible: true, locked: false, ...p,
});
const STAR = "M50 2 L61 36 L98 36 L68 58 L79 92 L50 71 L21 92 L32 58 L2 36 L39 36 Z";
const HEX = "M27 3 L73 3 L97 50 L73 97 L27 97 L3 50 Z";
const TRI = "M50 4 L97 96 L3 96 Z";
const ARROW = "M2 36 L58 36 L58 12 L98 50 L58 88 L58 64 L2 64 Z";
const HEART = "M50 88 C22 63 4 45 4 27 C4 12 15 3 27 3 C37 3 45 9 50 17 C55 9 63 3 73 3 C85 3 96 12 96 27 C96 45 78 63 50 88 Z";
const BOLT = "M57 2 L12 55 L42 55 L38 98 L88 40 L56 40 Z";
const SLASH = "M32 0 L48 0 L16 100 L0 100 Z";

const pv = (children: React.ReactNode, vb = "0 0 100 100") => (
  <svg viewBox={vb} className="w-9 h-9" aria-hidden>{children}</svg>
);

const ELEMENT_LIB: LibItem[] = [
  { label: "Square", cat: "Shapes", preview: pv(<rect x="14" y="14" width="72" height="72" rx="4" fill="#0e7c6b" />), make: () => [base({ type: "rect", name: "Square", width: 380, height: 380, fill: "#0e7c6b" })] },
  { label: "Rounded", cat: "Shapes", preview: pv(<rect x="10" y="22" width="80" height="56" rx="18" fill="#1b1d21" />), make: () => [base({ type: "rect", name: "Rounded panel", width: 460, height: 320, radius: 56, fill: "#1b1d21" })] },
  { label: "Circle", cat: "Shapes", preview: pv(<circle cx="50" cy="50" r="38" fill="#d9a441" />), make: () => [base({ type: "ellipse", name: "Circle", width: 380, height: 380, fill: "#d9a441" })] },
  { label: "Triangle", cat: "Shapes", preview: pv(<path d={TRI} fill="#c2543f" />), make: () => [base({ type: "path", name: "Triangle", width: 360, height: 340, data: TRI, fill: "#c2543f" })] },
  { label: "Star", cat: "Shapes", preview: pv(<path d={STAR} fill="#d9a441" />), make: () => [base({ type: "path", name: "Star", width: 340, height: 340, data: STAR, fill: "#d9a441" })] },
  { label: "Hexagon", cat: "Shapes", preview: pv(<path d={HEX} fill="#2563a8" />), make: () => [base({ type: "path", name: "Hexagon", width: 360, height: 360, data: HEX, fill: "#2563a8" })] },
  { label: "Line", cat: "Lines", preview: pv(<line x1="8" y1="50" x2="92" y2="50" stroke="#1b1d21" strokeWidth="7" strokeLinecap="round" />), make: () => [base({ type: "line", name: "Line", width: 440, height: 6, points: [0, 0, 440, 0], stroke: "#1b1d21", strokeWidth: 6 })] },
  { label: "Dashed", cat: "Lines", preview: pv(<line x1="8" y1="50" x2="92" y2="50" stroke="#1b1d21" strokeWidth="6" strokeLinecap="round" strokeDasharray="12 10" />), make: () => [base({ type: "line", name: "Dashed line", width: 440, height: 6, points: [0, 0, 440, 0], stroke: "#1b1d21", strokeWidth: 6, dash: [18, 14] })] },
  { label: "Arrow", cat: "Lines", preview: pv(<path d={ARROW} fill="#0e7c6b" />), make: () => [base({ type: "path", name: "Arrow", width: 400, height: 200, data: ARROW, fill: "#0e7c6b" })] },
  { label: "Heart", cat: "Icons", preview: pv(<path d={HEART} fill="#c04a3a" />), make: () => [base({ type: "path", name: "Heart", width: 280, height: 280, data: HEART, fill: "#c04a3a" })] },
  { label: "Bolt", cat: "Icons", preview: pv(<path d={BOLT} fill="#d9a441" />), make: () => [base({ type: "path", name: "Bolt", width: 240, height: 280, data: BOLT, fill: "#d9a441" })] },
  { label: "Check badge", cat: "Icons", preview: pv(<><circle cx="50" cy="50" r="42" fill="#0e7c6b" /><path d="M30 52 L45 66 L72 36" stroke="#fff" strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" /></>), make: () => [base({ type: "ellipse", name: "Check badge", width: 280, height: 280, fill: "#0e7c6b" }), base({ type: "path", name: "Check", width: 150, height: 150, data: "M6 52 L40 84 L94 16", fill: "transparent", stroke: "#ffffff", strokeWidth: 14 })] },
  { label: "CTA pill", cat: "Badges", preview: pv(<><rect x="6" y="30" width="88" height="40" rx="20" fill="#0e7c6b" /><text x="50" y="56" textAnchor="middle" fontSize="17" fontWeight="bold" fill="#fff">SHOP</text></>), make: () => [base({ type: "rect", name: "CTA button", width: 340, height: 88, radius: 44, fill: "#0e7c6b" }), base({ type: "text", name: "CTA text", width: 340, height: 44, y: 22, text: "SHOP NOW", fontSize: 30, fontFamily: "Poppins", fontStyle: "bold", color: "#ffffff", align: "center", letterSpacing: 2 })] },
  { label: "Offer circle", cat: "Badges", preview: pv(<><circle cx="50" cy="50" r="42" fill="#c2543f" /><text x="50" y="47" textAnchor="middle" fontSize="26" fontWeight="bold" fill="#fff">50%</text><text x="50" y="68" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#fff">OFF</text></>), make: () => [base({ type: "ellipse", name: "Offer badge", width: 320, height: 320, fill: "#c2543f" }), base({ type: "text", name: "Offer", width: 320, height: 120, y: 88, text: "50%\nOFF", fontSize: 64, fontFamily: "Bebas Neue", color: "#ffffff", align: "center", lineHeight: 1 })] },
  { label: "Three dots", cat: "Decor", preview: pv(<><circle cx="22" cy="50" r="9" fill="#0e7c6b" /><circle cx="50" cy="50" r="9" fill="#d9a441" /><circle cx="78" cy="50" r="9" fill="#c2543f" /></>), make: () => [0, 1, 2].map((i) => base({ type: "ellipse", name: `Dot ${i + 1}`, x: i * 90, width: 64, height: 64, fill: ["#0e7c6b", "#d9a441", "#c2543f"][i] })) },
  { label: "Ring", cat: "Decor", preview: pv(<circle cx="50" cy="50" r="36" fill="none" stroke="#0e7c6b" strokeWidth="9" />), make: () => [base({ type: "ellipse", name: "Ring", width: 320, height: 320, fill: "transparent", stroke: "#0e7c6b", strokeWidth: 18 })] },
  { label: "Quote mark", cat: "Decor", preview: pv(<text x="50" y="82" textAnchor="middle" fontSize="96" fontFamily="Georgia,serif" fill="#d9a441">“</text>), make: () => [base({ type: "text", name: "Quote mark", width: 300, height: 300, text: "“", fontSize: 280, fontFamily: "Playfair Display", color: "#d9a441", lineHeight: 0.9 })] },
  { label: "Slash", cat: "Decor", preview: pv(<path d={SLASH} fill="#1b1d21" />), make: () => [base({ type: "path", name: "Slash", width: 160, height: 460, data: SLASH, fill: "#1b1d21" })] },
];

const EL_CATS = ["Shapes", "Lines", "Icons", "Badges", "Decor"];

// ─── Panel ──────────────────────────────────────────────────────────────────
export default function LeftPanel() {
  const [tab, setTab] = useState<Tab>("templates");
  const doc = useEditorStore((s) => s.doc);
  const setDoc = useEditorStore((s) => s.setDoc);
  const addElements = useEditorStore((s) => s.addElements);
  const selection = useEditorStore((s) => s.selection);
  const updateElements = useEditorStore((s) => s.updateElements);
  const removeElements = useEditorStore((s) => s.removeElements);
  const select = useEditorStore((s) => s.select);
  const toast = useAppStore((s) => s.toast);
  const { uploads, add, remove } = useAssetsStore();
  const kit = useBrandStore((s) => s.kit);

  const [tplQ, setTplQ] = useState("");
  const [pendingTpl, setPendingTpl] = useState<DesignTemplate | null>(null);
  const [elCat, setElCat] = useState("Shapes");
  const [fontQ, setFontQ] = useState("");
  const [fontCat, setFontCat] = useState("All");
  const [dragLayer, setDragLayer] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const platform = useEditorStore((s) => s.designId);
  void platform;

  const templates = useMemo(() => {
    const ql = tplQ.trim().toLowerCase();
    const list = TEMPLATES.filter((t) => !ql || `${t.name} ${t.category} ${t.industry} ${t.tags.join(" ")}`.toLowerCase().includes(ql));
    if (!doc) return list;
    return [...list].sort((a, b) => {
      const am = (a.width === doc.width && a.height === doc.height ? 0 : 1);
      const bm = (b.width === doc.width && b.height === doc.height ? 0 : 1);
      return am - bm;
    });
  }, [tplQ, doc]);

  const fonts = FONTS.filter((f) => (fontCat === "All" || f.category === fontCat) && (!fontQ || f.family.toLowerCase().includes(fontQ.toLowerCase())));

  const placeCenter = (els: DesignElement[]) => {
    if (!doc) return;
    const maxX = Math.max(...els.map((e) => e.x + e.width));
    const maxY = Math.max(...els.map((e) => e.y + e.height));
    const ox = Math.round(doc.width / 2 - maxX / 2);
    const oy = Math.round(doc.height / 2 - maxY / 2);
    addElements(els.map((e) => ({ ...e, x: e.x + ox, y: e.y + oy })));
  };

  const addImageToCanvas = (src: string, w = 0, h = 0, name = "Image") => {
    if (!doc) return;
    const iw = w || 900, ih = h || 900;
    const width = Math.min(doc.width * 0.62, iw);
    const height = width * (ih / iw);
    addElements([{ id: uid("el"), type: "image", name, x: Math.round((doc.width - width) / 2), y: Math.round((doc.height - height) / 2), width: Math.round(width), height: Math.round(height), rotation: 0, opacity: 1, visible: true, locked: false, src }]);
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    let ok = 0;
    for (const f of Array.from(files)) {
      try {
        const { dataUrl, w, h } = await processUploadFile(f);
        add({ id: uid("up"), name: f.name, src: dataUrl, w, h, createdAt: Date.now() });
        ok++;
      } catch (e) { toast(e instanceof Error ? e.message : "Unable to upload image. Please try another file.", "error"); }
    }
    setUploading(false);
    if (ok) toast(`${ok} image${ok > 1 ? "s" : ""} uploaded.`, "success");
  };

  const applyTemplate = (t: DesignTemplate) => {
    if (!doc) return;
    setDoc({
      width: t.width, height: t.height,
      background: { ...t.design.background },
      elements: t.design.elements.map((e) => ({ ...e, id: uid("el") })),
    });
    setPendingTpl(null);
    toast(`Template “${t.name}” applied — everything is editable.`, "success");
  };

  const setBg = (bg: Background) => { if (doc) setDoc({ ...doc, background: bg }); };

  // layers reorder
  const onLayerDrop = (targetId: string) => {
    if (!doc || !dragLayer || dragLayer === targetId) return;
    const els = [...doc.elements];
    const from = els.findIndex((e) => e.id === dragLayer);
    const to = els.findIndex((e) => e.id === targetId);
    const [moved] = els.splice(from, 1);
    els.splice(to, 0, moved);
    setDoc({ ...doc, elements: els });
    setDragLayer(null);
  };

  const typeIcon = (t: DesignElement["type"]) =>
    t === "text" ? <Type size={13} /> : t === "image" ? <ImageIcon size={13} /> : <Shapes size={13} />;

  return (
    <div className="w-[76px] lg:w-[300px] shrink-0 border-r border-line bg-surface flex flex-col">
      {/* Tab rail */}
      <div className="lg:hidden flex overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cx("flex flex-col items-center gap-1 px-3 py-2.5 text-[10px] font-bold whitespace-nowrap cursor-pointer", tab === t.id ? "text-accent" : "text-faint")}>{t.icon}{t.label}</button>
        ))}
      </div>
      <div className="hidden lg:flex flex-col py-3 border-b border-line">
        <div className="grid grid-cols-4 gap-1 px-3">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} aria-label={t.label} title={t.label}
              className={cx("flex flex-col items-center gap-1 py-2.5 rounded-lg text-[9.5px] font-bold transition-colors cursor-pointer",
                tab === t.id ? "bg-accent/10 text-accent" : "text-faint hover:bg-surface2 hover:text-sub")}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5">
        {/* Templates */}
        {tab === "templates" && (
          <div>
            <SearchInput placeholder="Search templates…" value={tplQ} onChange={(e) => setTplQ(e.target.value)} className="mb-3" />
            {pendingTpl && (
              <div className="mb-3 p-2.5 rounded-xl border border-accent/40 bg-accent/5 anim-pop">
                <div className="rounded-lg overflow-hidden ring-1 ring-black/10 mb-2"><DocSVG doc={pendingTpl.design} width="100%" /></div>
                <p className="text-[12px] font-bold text-ink">{pendingTpl.name}</p>
                <p className="text-[10.5px] text-faint mb-2">{pendingTpl.width}×{pendingTpl.height} · replaces current canvas</p>
                <div className="flex gap-1.5">
                  <Button size="xs" className="flex-1" onClick={() => applyTemplate(pendingTpl)}>Apply</Button>
                  <Button size="xs" variant="ghost" onClick={() => setPendingTpl(null)}>Cancel</Button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              {templates.slice(0, 30).map((t) => (
                <button key={t.id} onClick={() => setPendingTpl(t)} className="group text-left cursor-pointer">
                  <div className="rounded-lg overflow-hidden ring-1 ring-black/10 group-hover:ring-2 group-hover:ring-accent transition-all">
                    <DocSVG doc={t.design} width="100%" />
                  </div>
                  <p className="text-[10.5px] font-bold text-sub mt-1 truncate">{t.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Elements */}
        {tab === "elements" && (
          <div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {EL_CATS.map((c) => (
                <button key={c} onClick={() => setElCat(c)} className={cx("px-2.5 py-1.5 rounded-full border text-[11.5px] font-bold cursor-pointer", elCat === c ? "border-accent bg-accent/10 text-accent" : "border-line text-sub hover:border-line2")}>{c}</button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ELEMENT_LIB.filter((i) => i.cat === elCat).map((item) => (
                <button key={item.label} onClick={() => placeCenter(item.make())}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-line bg-surface2/40 hover:border-accent hover:bg-accent/5 hover:-translate-y-0.5 transition-all cursor-pointer"
                  title={`Add ${item.label}`}>
                  {item.preview}
                  <span className="text-[10px] font-bold text-sub">{item.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-faint mt-3 leading-relaxed">Click to drop onto the canvas centre. Everything stays editable — resize, recolour, restack.</p>
          </div>
        )}

        {/* Text */}
        {tab === "text" && (
          <div>
            <div className="space-y-2 mb-4">
              {TEXT_PRESETS.map((p) => (
                <button key={p.id} onClick={() => {
                  if (!doc) return;
                  const fs = doc.width / 1080;
                  addElements([{ id: uid("el"), type: "text", name: p.label, x: Math.round(doc.width * 0.1), y: Math.round(doc.height * 0.4), width: Math.round(doc.width * 0.8), height: Math.round(p.fontSize * fs * 1.3), text: p.sample, fontSize: Math.round(p.fontSize * fs), fontFamily: p.family, fontStyle: p.italic ? "italic" : p.weight >= 700 ? "bold" : "normal", color: "#1b1d21", lineHeight: 1.2, align: "left", rotation: 0, opacity: 1, visible: true, locked: false }]);
                }}
                  className="w-full text-left p-3 rounded-xl border border-line bg-surface2/40 hover:border-accent transition-colors cursor-pointer">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-faint mb-1">{p.label}</span>
                  <span className="block text-ink truncate" style={{ fontFamily: `'${p.family}', sans-serif`, fontWeight: p.weight >= 700 ? 700 : 400, fontStyle: p.italic ? "italic" : "normal", fontSize: p.id === "heading" ? 21 : p.id === "offer" ? 23 : 15 }}>{p.sample}</span>
                </button>
              ))}
            </div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint mb-2">Font library</p>
            <SearchInput placeholder="Search fonts…" value={fontQ} onChange={(e) => setFontQ(e.target.value)} className="mb-2" />
            <div className="flex flex-wrap gap-1 mb-2">
              {["All", ...new Set(FONTS.map((f) => f.category))].map((c) => (
                <button key={c} onClick={() => setFontCat(c)} className={cx("px-2 py-1 rounded-full border text-[10.5px] font-bold cursor-pointer", fontCat === c ? "border-accent text-accent bg-accent/8" : "border-line text-sub")}>{c}</button>
              ))}
            </div>
            <div className="space-y-1">
              {fonts.map((f) => (
                <button key={f.id} onClick={() => {
                  if (!doc) return;
                  const fs = doc.width / 1080;
                  addElements([{ id: uid("el"), type: "text", name: f.family, x: Math.round(doc.width * 0.12), y: Math.round(doc.height * 0.42), width: Math.round(doc.width * 0.76), height: Math.round(70 * fs), text: f.family, fontSize: Math.round(56 * fs), fontFamily: f.family, fontStyle: "bold", color: "#1b1d21", align: "left", rotation: 0, opacity: 1, visible: true, locked: false }]);
                }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface2 transition-colors cursor-pointer group">
                  <span className="text-[17px] text-ink" style={{ fontFamily: `'${f.family}', sans-serif` }}>Ag — {f.family}</span>
                  <ChevronRight size={14} className="text-faint opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Uploads */}
        {tab === "uploads" && (
          <div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files); }}
              onClick={() => fileRef.current?.click()}
              role="button" tabIndex={0} aria-label="Upload images"
              onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
              className="border-2 border-dashed border-line2 hover:border-accent rounded-xl p-6 text-center cursor-pointer transition-colors bg-surface2/40 hover:bg-accent/4">
              <Upload size={20} className="mx-auto text-faint" />
              <p className="text-[13px] font-bold text-ink mt-2">{uploading ? "Processing…" : "Drop images here"}</p>
              <p className="text-[11px] text-faint mt-0.5">or click to browse · JPG, PNG, WebP, SVG</p>
            </div>
            <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
            {uploads.length === 0 ? (
              <p className="text-[12px] text-faint mt-4 leading-relaxed">Nothing uploaded yet. Images are compressed and stored locally, ready to drag onto any design.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 mt-3">
                {uploads.map((u) => (
                  <div key={u.id} draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/fs-asset", u.id); e.dataTransfer.setData("text/fs-src", u.src); }}
                    className="group relative rounded-lg overflow-hidden ring-1 ring-black/10 cursor-grab active:cursor-grabbing"
                    title={`${u.name} — drag onto canvas or click to add`}>
                    <img src={u.src} alt={u.name} className="w-full h-24 object-cover" onClick={() => addImageToCanvas(u.src, u.w, u.h, u.name)} />
                    <button onClick={() => { remove(u.id); toast("Upload removed.", "info"); }} aria-label={`Delete ${u.name}`}
                      className="absolute top-1 right-1 w-6 h-6 rounded-md bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stock images */}
        {tab === "images" && (
          <div>
            <p className="text-[12px] text-sub leading-relaxed mb-3">Sample photography for placeholders and mood boards — click to add, drag from the uploads tab for your own.</p>
            <div className="grid grid-cols-2 gap-2">
              {STOCK_IMAGES.map((s) => (
                <button key={s.id} onClick={() => addImageToCanvas(s.src, 1024, 1024, s.label)}
                  className="group relative rounded-lg overflow-hidden ring-1 ring-black/10 text-left cursor-pointer">
                  <img src={s.src} alt={s.label} loading="lazy" className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[10.5px] font-bold px-2 pb-1.5 pt-4">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Background */}
        {tab === "background" && doc && (
          <div className="space-y-5">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint mb-2">Solid</p>
              <div className="grid grid-cols-7 gap-1.5">
                {SOLID_SWATCHES.map((c) => (
                  <button key={c} onClick={() => setBg({ type: "solid", color: c })} aria-label={`Background ${c}`}
                    className={cx("aspect-square rounded-lg border border-line hover:scale-110 transition-transform cursor-pointer", doc.background.type === "solid" && doc.background.color === c && "ring-2 ring-accent")}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint mb-2">Gradient</p>
              <div className="grid grid-cols-4 gap-1.5">
                {GRADIENT_PRESETS.map((g) => (
                  <button key={g.name} onClick={() => setBg({ type: "gradient", gradient: g.spec })} title={g.name}
                    className={cx("aspect-square rounded-lg border border-line hover:scale-105 transition-transform cursor-pointer", doc.background.type === "gradient" && doc.background.gradient?.stops[0].color === g.spec.stops[0].color && "ring-2 ring-accent")}
                    style={{ background: g.spec.kind === "radial" ? `radial-gradient(circle at 40% 35%, ${g.spec.stops[0].color}, ${g.spec.stops[1].color})` : `linear-gradient(${g.spec.angle}deg, ${g.spec.stops[0].color}, ${g.spec.stops[1].color})` }} />
                ))}
              </div>
              <p className="text-[10.5px] text-faint mt-1.5">Linear & radial · stops editable via element fills too.</p>
            </div>
            {uploads.length > 0 && (
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint mb-2">Image</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {uploads.slice(0, 6).map((u) => (
                    <button key={u.id} onClick={() => setBg({ type: "image", src: u.src })} className="aspect-square rounded-lg overflow-hidden ring-1 ring-black/10 hover:ring-2 hover:ring-accent cursor-pointer">
                      <img src={u.src} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Button variant="outline" size="sm" className="w-full" onClick={() => setBg({ type: "transparent" })}>Transparent background</Button>
          </div>
        )}

        {/* Brand */}
        {tab === "brand" && doc && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl border border-line bg-surface2/40">
              <div className="flex items-center gap-3">
                {kit.logo ? <img src={kit.logo} alt="Brand logo" className="w-11 h-11 rounded-lg border border-line object-contain bg-white p-1" /> : <span className="w-11 h-11 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-display font-bold text-lg">{kit.name[0]}</span>}
                <div>
                  <p className="text-[13.5px] font-bold text-ink">{kit.name}</p>
                  <p className="text-[11px] text-faint">{kit.fonts.heading} + {kit.fonts.body}</p>
                </div>
              </div>
              <div className="flex gap-1.5 mt-3">
                {Object.entries(kit.colors).map(([k, c]) => (
                  <button key={k} title={`Set canvas background to ${k}`} onClick={() => setBg({ type: "solid", color: c })}
                    className="flex-1 h-9 rounded-lg border border-line hover:scale-105 transition-transform cursor-pointer" style={{ background: c }} aria-label={`Use ${k} as background`} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full" disabled={!kit.logo} onClick={() => {
                if (!doc || !kit.logo) return;
                const w = doc.width * 0.22;
                addElements([{ id: uid("el"), type: "image", name: "Brand logo", x: Math.round(doc.width * 0.06), y: Math.round(doc.height * 0.05), width: Math.round(w), height: Math.round(w), rotation: 0, opacity: 1, visible: true, locked: false, src: kit.logo }]);
                toast("Logo added to canvas.", "success");
              }}>Add logo to canvas</Button>
              <Button variant="outline" size="sm" className="w-full" disabled={selection.length === 0} onClick={() => {
                updateElements(selection, (e) => e.type === "text" ? { ...e, fontFamily: kit.fonts.heading, fontStyle: "bold" } : e);
                toast("Heading font applied to selected text.", "success");
              }}>Apply heading font to selection</Button>
              <Button variant="outline" size="sm" className="w-full" disabled={selection.length === 0} onClick={() => {
                updateElements(selection, (e) => e.type === "text" ? { ...e, color: kit.colors.primary } : (e.type === "rect" || e.type === "ellipse" || e.type === "path") ? { ...e, fill: kit.colors.primary } : e);
                toast("Primary colour applied.", "success");
              }}>Apply primary colour to selection</Button>
            </div>
            <p className="text-[11.5px] text-faint leading-relaxed">Edit the kit any time under <span className="font-bold text-sub">Brand Kit</span> — it syncs here instantly.</p>
          </div>
        )}

        {/* Layers */}
        {tab === "layers" && doc && (
          <div>
            {doc.elements.length === 0 ? (
              <p className="text-[12.5px] text-faint leading-relaxed py-6 text-center">The canvas is empty — add text, shapes or an image and the stack appears here.</p>
            ) : (
              <div className="space-y-1">
                {[...doc.elements].reverse().map((e) => (
                  <div key={e.id}
                    draggable
                    onDragStart={() => setDragLayer(e.id)}
                    onDragOver={(ev) => ev.preventDefault()}
                    onDrop={() => onLayerDrop(e.id)}
                    onClick={() => select([e.id])}
                    className={cx("flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer transition-colors",
                      selection.includes(e.id) ? "border-accent/50 bg-accent/6" : "border-transparent hover:bg-surface2",
                      dragLayer === e.id && "opacity-40")}>
                    <span className="text-faint cursor-grab" title="Drag to reorder">⋮⋮</span>
                    <span className="text-sub shrink-0">{typeIcon(e.type)}</span>
                    <span className={cx("flex-1 text-[12.5px] font-semibold truncate", !e.visible && "line-through text-faint")}>{e.name}</span>
                    {e.locked && <Lock size={11} className="text-gold shrink-0" />}
                    <IconBtn label={e.visible ? "Hide layer" : "Show layer"} size="sm" onClick={(ev) => { ev.stopPropagation(); updateElements([e.id], (x) => ({ ...x, visible: !x.visible })); }}>
                      {e.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                    </IconBtn>
                    <IconBtn label={e.locked ? "Unlock layer" : "Lock layer"} size="sm" onClick={(ev) => { ev.stopPropagation(); updateElements([e.id], (x) => ({ ...x, locked: !x.locked })); }}>
                      {e.locked ? <Lock size={13} /> : <Unlock size={13} />}
                    </IconBtn>
                    <IconBtn label="Duplicate layer" size="sm" onClick={(ev) => { ev.stopPropagation(); addElements([{ ...e, id: uid("el"), x: e.x + 24, y: e.y + 24 }]); }}>
                      <Copy size={13} />
                    </IconBtn>
                    <IconBtn label="Delete layer" size="sm" onClick={(ev) => { ev.stopPropagation(); removeElements([e.id]); }}>
                      <Trash2 size={13} />
                    </IconBtn>
                  </div>
                ))}
                <p className="text-[10.5px] text-faint pt-2 flex items-center gap-1"><ArrowUp size={11} /> Top of list = front of canvas. Drag rows to restack.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
