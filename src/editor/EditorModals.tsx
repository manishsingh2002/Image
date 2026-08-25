import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Camera, Check, Copy, FileDown, History as HistoryIcon, ImagePlus, Link2, Loader2, RotateCcw, Save, Smartphone, Sparkles, Trash2 } from "lucide-react";
import { Badge, Button, Field, Modal, Seg, SelectBox, SliderRow, TextArea, Input, Toggle } from "../components/ui";
import DocSVG from "../components/DocSVG";
import { CONTENT_TONES, FONTS, PLATFORMS } from "../lib/constants";
import { renderDocument, jpegDataUrlToPdf, type ExportFormat } from "../lib/exporter";
import { ai, loadVersions, saveVersions, useAppStore, useDesignsStore, useEditorStore } from "../stores";
import { generateContent } from "../lib/templateFactory";
import type { AISuggestion, DesignDocument, DesignElement, VersionSnap } from "../types";
import { clamp, coverCrop, downloadBlob, downloadDataUrl, fmtDate, loadImage, timeAgo, uid } from "../lib/utils";

// ─── Export ─────────────────────────────────────────────────────────────────
export function ExportModal({ open, onClose, doc, name }: { open: boolean; onClose: () => void; doc: DesignDocument; name: string }) {
  const toast = useAppStore((s) => s.toast);
  const [format, setFormat] = useState<ExportFormat>("png");
  const [scale, setScale] = useState<2 | 1 | 3 | 4>(2);
  const [quality, setQuality] = useState(92);
  const [transparent, setTransparent] = useState(false);
  const [stage, setStage] = useState<string | null>(null);

  const supportsQuality = format === "jpeg" || format === "webp";
  const supportsAlpha = format === "png" || format === "webp";
  const outW = doc.width * scale, outH = doc.height * scale;

  const run = async () => {
    setStage("Preparing design…");
    try {
      const dataUrl = await renderDocument(doc, {
        scale, format: format === "pdf" ? "jpeg" : format,
        quality: quality / 100, transparent: supportsAlpha && transparent,
        onProgress: setStage,
      });
      const file = name.replace(/\s+/g, "-").toLowerCase();
      if (format === "pdf") {
        downloadBlob(jpegDataUrlToPdf(dataUrl, outW, outH), `${file}.pdf`);
      } else {
        downloadDataUrl(dataUrl, `${file}@${scale}x.${format === "jpeg" ? "jpg" : format}`);
      }
      setStage("Download ready");
      toast(`${outW} × ${outH}px ${format.toUpperCase()} exported.`, "success");
      setTimeout(() => { setStage(null); }, 1400);
    } catch {
      setStage(null);
      toast("Export failed. Please try again.", "error");
    }
  };

  return (
    <Modal open={open} onClose={() => !stage && onClose()} title="Export design" subtitle="Render a production-ready file from the vector document." footer={
      <>
        <Button variant="ghost" onClick={onClose} disabled={!!stage}>Cancel</Button>
        <Button onClick={run} disabled={!!stage}>
          {stage ? <><Loader2 size={15} className="animate-spin" /> {stage}</> : <><FileDown size={15} /> Export design</>}
        </Button>
      </>
    }>
      <div className="space-y-5">
        <Field label="Format">
          <Seg value={format} onChange={setFormat} options={[
            { value: "png", label: "PNG" }, { value: "jpeg", label: "JPG" },
            { value: "webp", label: "WebP" }, { value: "pdf", label: "PDF" },
          ]} />
        </Field>
        <Field label="Resolution">
          <div className="flex gap-2">
            {([1, 2, 3, 4] as const).map((s) => (
              <button key={s} onClick={() => setScale(s)}
                className={`flex-1 py-2.5 rounded-lg border text-center cursor-pointer transition-all ${scale === s ? "border-accent bg-accent/8 text-accent" : "border-line bg-surface2/50 text-sub hover:border-line2"}`}>
                <span className="block text-sm font-bold">{s}×</span>
                <span className="block text-[10.5px] mt-0.5 text-faint">{doc.width * s}×{doc.height * s}</span>
              </button>
            ))}
          </div>
        </Field>
        {supportsQuality && <SliderRow label="Quality" value={quality} min={40} max={100} onChange={setQuality} format={(v) => `${v}%`} />}
        {supportsAlpha && <Toggle checked={transparent} onChange={() => setTransparent((t) => !t)} label="Transparent background" />}
        {format === "pdf" && <p className="text-[11.5px] text-faint">PDF embeds a flattened {outW}×{outH} raster at 72 DPI points — ideal for sharing, not for further vector editing.</p>}
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface2 border border-line">
          <span className="text-[12.5px] font-semibold text-sub">Output</span>
          <span className="text-[13px] font-bold text-ink tabular-nums">{outW} × {outH}px</span>
        </div>
      </div>
    </Modal>
  );
}

// ─── Smart crop ─────────────────────────────────────────────────────────────
const CROP_RATIOS = [
  { label: "Original", w: 0, h: 0 }, { label: "1:1", w: 1, h: 1 }, { label: "4:5", w: 4, h: 5 },
  { label: "9:16", w: 9, h: 16 }, { label: "16:9", w: 16, h: 9 }, { label: "4:3", w: 4, h: 3 }, { label: "3:4", w: 3, h: 4 },
];

export function CropModal({ open, onClose, el, onApply }: {
  open: boolean; onClose: () => void; el: DesignElement;
  onApply: (crop: DesignElement["crop"]) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(CROP_RATIOS[0]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const [boxW, setBoxW] = useState(420);

  useEffect(() => {
    if (!open) return;
    setRatio(CROP_RATIOS[0]); setZoom(1); setPan({ x: 0, y: 0 });
    loadImage(el.src!).then((img) => setNatural({ w: img.naturalWidth, h: img.naturalHeight })).catch(() => {});
    const measure = () => boxRef.current && setBoxW(Math.min(460, boxRef.current.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    if (boxRef.current) ro.observe(boxRef.current);
    return () => ro.disconnect();
  }, [open, el.src]);

  const r = ratio.w === 0 ? (el.crop ? el.crop.sw / el.crop.sh : el.width / el.height) : ratio.w / ratio.h;
  const boxH = boxW / r;

  const baseScale = natural.w ? Math.max(boxW / natural.w, boxH / natural.h) : 1;
  const rs = baseScale * zoom;
  const rw = natural.w * rs, rh = natural.h * rs;
  const clampPan = useCallback((x: number, y: number) => ({
    x: clamp(x, boxW - rw, 0) || 0,
    y: clamp(y, boxH - rh, 0) || 0,
  }), [boxW, boxH, rw, rh]);

  const apply = () => {
    if (!natural.w) { onApply(null); onClose(); return; }
    const left = (boxW - rw) / 2 + pan.x;
    const top = (boxH - rh) / 2 + pan.y;
    let sx = -left / rs, sy = -top / rs, sw = boxW / rs, sh = boxH / rs;
    sx = clamp(sx, 0, natural.w); sy = clamp(sy, 0, natural.h);
    sw = Math.min(sw, natural.w - sx); sh = Math.min(sh, natural.h - sy);
    onApply({ sx: Math.round(sx), sy: Math.round(sy), sw: Math.max(2, Math.round(sw)), sh: Math.max(2, Math.round(sh)), iw: natural.w, ih: natural.h });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Crop image" subtitle="Drag to reposition, zoom to tighten the frame." width="max-w-xl" footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={apply}><Check size={15} /> Apply crop</Button>
      </>
    }>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {CROP_RATIOS.map((cr) => (
          <button key={cr.label} onClick={() => { setRatio(cr); setZoom(1); setPan({ x: 0, y: 0 }); }}
            className={`px-3 py-1.5 rounded-full border text-[12px] font-bold cursor-pointer transition-colors ${ratio.label === cr.label ? "border-accent bg-accent/10 text-accent" : "border-line bg-surface2/60 text-sub hover:border-line2"}`}>
            {cr.label}
          </button>
        ))}
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line text-[12px] font-bold text-sub hover:text-ink cursor-pointer">
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      <div ref={boxRef}>
        <div
          className="relative mx-auto overflow-hidden rounded-xl bg-black/90 checker cursor-grab active:cursor-grabbing touch-none"
          style={{ width: boxW, height: boxH }}
          onPointerDown={(e) => { drag.current = { px: e.clientX, py: e.clientY, ox: pan.x, oy: pan.y }; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            setPan(clampPan(drag.current.ox + (e.clientX - drag.current.px), drag.current.oy + (e.clientY - drag.current.py)));
          }}
          onPointerUp={() => { drag.current = null; }}
        >
          {natural.w > 0 && (
            <img src={el.src} alt="Crop preview" draggable={false} className="absolute max-w-none select-none"
              style={{ width: rw, height: rh, left: (boxW - rw) / 2 + pan.x, top: (boxH - rh) / 2 + pan.y }} />
          )}
          {/* rule-of-thirds overlay */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/25" />
            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/25" />
            <div className="absolute top-1/3 left-0 right-0 h-px bg-white/25" />
            <div className="absolute top-2/3 left-0 right-0 h-px bg-white/25" />
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <SliderRow label="Zoom" value={Math.round(zoom * 100)} min={100} max={400} onChange={(v) => { setZoom(v / 100); setPan((p) => clampPan(p.x * (v / 100 / zoom), p.y * (v / 100 / zoom))); }} format={(v) => `${v}%`} />
        <p className="text-[11.5px] text-faint leading-relaxed flex gap-1.5"><Sparkles size={13} className="text-accent shrink-0 mt-0.5" />
          Smart subject-detection cropping is architecture-ready (saliency map input on <code className="font-mono">coverCrop</code>). Today, auto-centering keeps the subject framed for the selected ratio.</p>
      </div>
    </Modal>
  );
}

// ─── Resize document ────────────────────────────────────────────────────────
export function ResizeModal({ open, onClose, doc, onApply }: {
  open: boolean; onClose: () => void; doc: DesignDocument; onApply: (w: number, h: number) => void;
}) {
  const [target, setTarget] = useState<string>("instagram-story");
  const [cw, setCw] = useState(doc.width);
  const [ch, setCh] = useState(doc.height);
  const preset = PLATFORMS.find((p) => p.id === target);
  const tw = target === "custom" ? cw : preset?.width || doc.width;
  const th = target === "custom" ? ch : preset?.height || doc.height;

  return (
    <Modal open={open} onClose={onClose} title="Resize design" subtitle="Elements are re-laid out proportionally — nothing is simply stretched." footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { onApply(tw, th); onClose(); }}>Resize to {tw} × {th}</Button>
      </>
    }>
      <Field label="Target format">
        <SelectBox value={target} onChange={setTarget} ariaLabel="Target format"
          options={[...PLATFORMS.map((p) => ({ value: p.id, label: `${p.label} — ${p.width}×${p.height}` })), { value: "custom", label: "Custom size" }]} />
      </Field>
      {target === "custom" && (
        <div className="flex gap-3 mt-3">
          <Field label="Width"><Input type="number" value={cw} min={8} onChange={(e) => setCw(parseInt(e.target.value) || 8)} /></Field>
          <Field label="Height"><Input type="number" value={ch} min={8} onChange={(e) => setCh(parseInt(e.target.value) || 8)} /></Field>
        </div>
      )}
      <div className="flex items-center justify-center gap-5 mt-5">
        <div className="text-center">
          <div className="border-2 border-line2 rounded mx-auto bg-surface2/50" style={{ width: 64, height: 64 * (doc.height / doc.width) }} />
          <p className="text-[11px] font-bold text-faint mt-2">{doc.width}×{doc.height}</p>
        </div>
        <span className="text-sub font-bold">→</span>
        <div className="text-center">
          <div className="border-2 border-accent rounded mx-auto bg-accent/8" style={{ width: tw >= th ? 64 : 64 * (tw / th), height: tw >= th ? 64 * (th / tw) : 64 }} />
          <p className="text-[11px] font-bold text-accent mt-2">{tw}×{th}</p>
        </div>
      </div>
      <ul className="mt-5 space-y-1.5 text-[12.5px] text-sub">
        {["Positions scale with the canvas ratio", "Type sizes follow the area ratio, keeping hierarchy", "Everything is clamped inside the new safe bounds"].map((x) => (
          <li key={x} className="flex gap-2"><Check size={14} className="text-accent mt-0.5 shrink-0" />{x}</li>
        ))}
      </ul>
    </Modal>
  );
}

// ─── Preview ────────────────────────────────────────────────────────────────
export function PreviewModal({ open, onClose, doc, name }: { open: boolean; onClose: () => void; doc: DesignDocument; name: string }) {
  const isPhone = doc.width / doc.height < 0.8;
  return (
    <Modal open={open} onClose={onClose} title={name} subtitle={`${doc.width} × ${doc.height}px · ${isPhone ? "shown in phone frame" : "actual ratio"}`} width="max-w-2xl">
      <div className="flex justify-center py-2">
        {isPhone ? (
          <div className="rounded-[2.4rem] border-[10px] border-ink dark:border-line2 bg-black shadow-2xl relative" style={{ width: 300 }}>
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4.5 bg-black rounded-full z-10 border border-white/10" />
            <div className="rounded-[1.8rem] overflow-hidden">
              <DocSVG doc={doc} width="100%" />
            </div>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden shadow-2xl ring-1 ring-black/10 max-h-[62vh]">
            <DocSVG doc={doc} width={doc.width >= doc.height ? 640 : 640 * (doc.width / doc.height)} />
          </div>
        )}
      </div>
      <p className="text-center text-[11.5px] text-faint mt-3 flex items-center justify-center gap-1.5"><Smartphone size={12} /> Editor chrome hidden — this is exactly what exports.</p>
    </Modal>
  );
}

// ─── Version history ────────────────────────────────────────────────────────
export function HistoryModal({ open, onClose, designId, doc }: { open: boolean; onClose: () => void; designId: string; doc: DesignDocument }) {
  const toast = useAppStore((s) => s.toast);
  const nav = useNavigate();
  const { createDesign, updateDoc } = useDesignsStore();
  const setDoc = useEditorStore((s) => s.setDoc);
  const [versions, setVersions] = useState<VersionSnap[]>([]);

  useEffect(() => { if (open) setVersions(loadVersions(designId)); }, [open, designId]);
  const persist = (v: VersionSnap[]) => { setVersions(v); saveVersions(designId, v); };

  return (
    <Modal open={open} onClose={onClose} title="Version history" subtitle="Snapshots of the design JSON — restore or branch any of them." footer={
      <>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button onClick={() => { persist([{ id: uid("v"), label: `Snapshot ${versions.length + 1}`, ts: Date.now(), doc: JSON.parse(JSON.stringify(doc)) }, ...versions]); toast("Snapshot saved.", "success"); }}>
          <Save size={14} /> Save snapshot
        </Button>
      </>
    }>
      {versions.length === 0 ? (
        <div className="text-center py-8">
          <HistoryIcon size={26} className="mx-auto text-faint" />
          <p className="text-sm font-semibold text-ink mt-3">No snapshots yet</p>
          <p className="text-[12.5px] text-sub mt-1">Save one before a big change — you can always come back.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {versions.map((v) => (
            <div key={v.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-line bg-surface2/40 hover:border-line2 transition-colors">
              <div className="w-12 rounded overflow-hidden ring-1 ring-black/10 shrink-0"><DocSVG doc={v.doc} width="100%" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-ink">{v.label}</p>
                <p className="text-[11px] text-faint">{timeAgo(v.ts)} · {fmtDate(v.ts)} · {v.doc.elements.length} elements</p>
              </div>
              <Button size="xs" variant="outline" onClick={() => { setDoc(v.doc); toast("Version restored — undo is available.", "success"); onClose(); }}>Restore</Button>
              <Button size="xs" variant="ghost" onClick={() => {
                const id = createDesign({ platform: "custom", width: v.doc.width, height: v.doc.height });
                updateDoc(id, v.doc);
                toast("Snapshot duplicated as a new design.", "success");
                onClose(); nav(`/editor/${id}`);
              }}>Branch</Button>
              <Button size="xs" variant="ghost" className="!text-danger" onClick={() => persist(versions.filter((x) => x.id !== v.id))} aria-label="Delete snapshot"><Trash2 size={13} /></Button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ─── Share ──────────────────────────────────────────────────────────────────
export function ShareModal({ open, onClose, designId }: { open: boolean; onClose: () => void; designId: string }) {
  const toast = useAppStore((s) => s.toast);
  const shares = useAppStore((s) => s.shares);
  const addShare = useAppStore((s) => s.addShare);
  const [perm, setPerm] = useState<"view" | "edit">("view");
  const existing = shares.filter((s) => s.designId === designId);

  const makeLink = () => {
    const link = addShare(designId, perm);
    const url = `${location.origin}${location.pathname}#/shared/${link.id}`;
    navigator.clipboard?.writeText(url).then(
      () => toast("Share link copied.", "success"),
      () => toast(`Link ready: ${url}`, "info")
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Share this design" subtitle="Generate a link with the permission you choose." footer={
      <>
        <Button variant="ghost" onClick={onClose}>Done</Button>
        <Button onClick={makeLink}><Link2 size={14} /> Create {perm === "view" ? "view" : "edit"} link</Button>
      </>
    }>
      <div className="flex items-center justify-between">
        <p className="text-sm text-sub">Permission</p>
        <Seg value={perm} onChange={setPerm} options={[{ value: "view", label: "Can view" }, { value: "edit", label: "Can edit" }]} />
      </div>
      {existing.length > 0 && (
        <div className="mt-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint mb-2">Existing links</p>
          {existing.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 py-2 border-b border-line last:border-0">
              <code className="text-[11.5px] text-sub truncate">…#/shared/{s.id}</code>
              <span className="flex items-center gap-2">
                <Badge tone={s.permission === "edit" ? "accent" : "neutral"}>{s.permission}</Badge>
                <Button size="xs" variant="outline" onClick={() => { navigator.clipboard?.writeText(`${location.origin}${location.pathname}#/shared/${s.id}`); toast("Link copied.", "success"); }}><Copy size={12} /> Copy</Button>
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11.5px] text-faint mt-4 leading-relaxed">Live co-editing syncs once the Supabase realtime layer is connected — the share + permission schema is already in place.</p>
    </Modal>
  );
}

// ─── AI assistant ───────────────────────────────────────────────────────────
export function AIPanel({ open, onClose, doc }: { open: boolean; onClose: () => void; doc: DesignDocument }) {
  const toast = useAppStore((s) => s.toast);
  const { addElements, updateElements, selection, setDoc } = useEditorStore();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [sug, setSug] = useState<AISuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState("headline");
  const [tone, setTone] = useState("Professional");
  const [topic, setTopic] = useState("");
  const [variants, setVariants] = useState<string[]>([]);

  const selectedText = doc.elements.find((e) => selection[0] === e.id && e.type === "text");

  const suggest = async () => {
    if (!prompt.trim()) { setError("Describe the post first — e.g. “Instagram post for my jewellery shop, 20% festival discount”."); return; }
    setError(null); setBusy(true); setSug(null);
    try { setSug(await ai.suggest(prompt)); } catch { setError("The assistant couldn't produce a suggestion. Try rephrasing."); }
    setBusy(false);
  };

  const apply = () => {
    if (!sug) return;
    const W = doc.width, fs = W / 1080;
    const els: DesignElement[] = [
      { id: uid("el"), type: "text", name: "Heading", x: Math.round(W * 0.08), y: Math.round(doc.height * 0.14), width: Math.round(W * 0.84), height: Math.round(200 * fs), text: sug.headline, fontSize: Math.round(84 * fs), fontFamily: "Montserrat", fontStyle: "bold", color: sug.palette.ink, lineHeight: 1.05, align: "left", rotation: 0, opacity: 1, visible: true, locked: false },
      { id: uid("el"), type: "text", name: "Subheadline", x: Math.round(W * 0.08), y: Math.round(doc.height * 0.42), width: Math.round(W * 0.8), height: Math.round(100 * fs), text: sug.subheadline, fontSize: Math.round(28 * fs), fontFamily: "Inter", color: sug.palette.muted, lineHeight: 1.5, align: "left", rotation: 0, opacity: 1, visible: true, locked: false },
    ];
    if (sug.offer) els.push({ id: uid("el"), type: "ellipse", name: "Offer badge", x: Math.round(W * 0.66), y: Math.round(doc.height * 0.58), width: Math.round(240 * fs), height: Math.round(240 * fs), fill: sug.palette.accent, rotation: 0, opacity: 1, visible: true, locked: false },
      { id: uid("el"), type: "text", name: "Offer", x: Math.round(W * 0.66), y: Math.round(doc.height * 0.58 + 84 * fs), width: Math.round(240 * fs), height: Math.round(60 * fs), text: sug.offer, fontSize: Math.round(52 * fs), fontFamily: "Montserrat", fontStyle: "bold", color: sug.palette.bg, align: "center", lineHeight: 1, rotation: 0, opacity: 1, visible: true, locked: false });
    els.push(
      { id: uid("el"), type: "rect", name: "CTA button", x: Math.round(W * 0.08), y: Math.round(doc.height * 0.8), width: Math.round(300 * fs), height: Math.round(76 * fs), radius: Math.round(38 * fs), fill: sug.palette.accent, rotation: 0, opacity: 1, visible: true, locked: false },
      { id: uid("el"), type: "text", name: "CTA", x: Math.round(W * 0.08), y: Math.round(doc.height * 0.8 + 22 * fs), width: Math.round(300 * fs), height: Math.round(40 * fs), text: sug.cta, fontSize: Math.round(26 * fs), fontFamily: "Inter", fontStyle: "bold", color: sug.palette.bg, align: "center", letterSpacing: 2, rotation: 0, opacity: 1, visible: true, locked: false },
    );
    setDoc({ ...doc, background: { type: "solid", color: sug.palette.bg } });
    addElements(els);
    toast("Suggestion applied — every element stays editable.", "success");
  };

  const genVariants = () => setVariants(generateContent(kind, topic || prompt || "your brand", tone));
  const useVariant = (v: string) => {
    if (kind === "rewrite" && selectedText) {
      updateElements([selectedText.id], (e) => ({ ...e, text: v }));
      toast("Text rewritten on canvas.", "success");
    } else if (kind === "headline" || kind === "cta") {
      const fs = doc.width / 1080;
      addElements([{ id: uid("el"), type: "text", name: kind === "cta" ? "CTA" : "Heading", x: Math.round(doc.width * 0.1), y: Math.round(doc.height * 0.3), width: Math.round(doc.width * 0.8), height: Math.round(90 * fs), text: v, fontSize: Math.round((kind === "cta" ? 34 : 72) * fs), fontFamily: kind === "cta" ? "Inter" : "Montserrat", fontStyle: "bold", color: "#1b1d21", align: "center", rotation: 0, opacity: 1, visible: true, locked: false }]);
      toast("Added to canvas.", "success");
    } else {
      navigator.clipboard?.writeText(v).then(() => toast("Copied to clipboard.", "success"), () => toast(v, "info"));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="AI design assistant" width="max-w-2xl"
      subtitle="Drafting runs on the built-in local engine. Connect an AI provider key for generative results — the interface is ready.">
      <Field label="Describe the post">
        <TextArea rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Instagram post for my jewellery shop announcing a 20% festival discount" />
      </Field>
      {error && <p className="flex items-center gap-2 text-[12.5px] font-semibold text-danger mt-2"><AlertTriangle size={13} /> {error}</p>}
      <Button className="mt-3" onClick={suggest} disabled={busy}>
        {busy ? <><Loader2 size={15} className="animate-spin" /> Drafting…</> : <><Sparkles size={15} /> Generate suggestion</>}
      </Button>

      {sug && (
        <div className="mt-5 rounded-xl border border-accent/25 bg-accent/4 p-4 anim-pop">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-accent">Suggested content</p>
            <Button size="sm" onClick={apply}>Apply to design</Button>
          </div>
          <dl className="grid sm:grid-cols-2 gap-x-5 gap-y-2.5 mt-3 text-[13px]">
            <div><dt className="text-[10.5px] font-bold uppercase text-faint">Headline</dt><dd className="font-bold text-ink">{sug.headline}</dd></div>
            {sug.offer && <div><dt className="text-[10.5px] font-bold uppercase text-faint">Offer</dt><dd className="font-bold text-ink">{sug.offer}</dd></div>}
            <div><dt className="text-[10.5px] font-bold uppercase text-faint">Subheadline</dt><dd className="text-sub">{sug.subheadline}</dd></div>
            <div><dt className="text-[10.5px] font-bold uppercase text-faint">CTA</dt><dd className="font-bold text-ink">{sug.cta}</dd></div>
            <div><dt className="text-[10.5px] font-bold uppercase text-faint mb-1">Palette · {sug.palette.name}</dt>
              <dd className="flex gap-1.5">{[sug.palette.bg, sug.palette.ink, sug.palette.accent, sug.palette.soft].map((c) => <span key={c} className="w-6 h-6 rounded-md border border-line" style={{ background: c }} title={c} />)}</dd></div>
            <div><dt className="text-[10.5px] font-bold uppercase text-faint">Layout</dt><dd className="text-sub">{sug.layout}</dd></div>
          </dl>
          <div className="mt-3 pt-3 border-t border-accent/15">
            <p className="text-[10.5px] font-bold uppercase text-faint">Caption</p>
            <p className="text-[12.5px] text-sub mt-1 leading-relaxed">{sug.caption}</p>
            <p className="text-[12px] font-semibold text-accent mt-1.5">{sug.hashtags.join(" ")}</p>
          </div>
        </div>
      )}

      <div className="mt-6 pt-5 border-t border-line">
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint mb-3">Content tools</p>
        <div className="flex flex-wrap gap-2 items-end">
          <Field label="Generate">
            <SelectBox value={kind} onChange={setKind} ariaLabel="Content kind" className="w-44"
              options={[["headline", "Headline"], ["caption", "Caption"], ["cta", "Call to action"], ["description", "Product description"], ["hashtags", "Hashtags"], ["rewrite", selectedText ? "Rewrite selected text" : "Rewrite (select text)"]].map(([v, l]) => ({ value: v, label: l }))} />
          </Field>
          <Field label="Tone">
            <SelectBox value={tone} onChange={setTone} ariaLabel="Tone" className="w-36" options={CONTENT_TONES.map((t) => ({ value: t, label: t }))} />
          </Field>
          <Field label="About (optional)">
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. gold jhumka earrings" className="w-52" />
          </Field>
          <Button variant="outline" onClick={genVariants}><Sparkles size={14} /> Generate</Button>
        </div>
        {variants.length > 0 && (
          <div className="space-y-2 mt-3.5">
            {variants.map((v, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2.5 pl-3.5 rounded-lg bg-surface2 border border-line anim-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                <p className="flex-1 text-[13px] text-ink leading-snug">{v}</p>
                <Button size="xs" variant="ghost" onClick={() => { navigator.clipboard?.writeText(v); toast("Copied.", "success"); }} aria-label="Copy"><Copy size={13} /></Button>
                <Button size="xs" variant="outline" onClick={() => useVariant(v)}>{kind === "rewrite" ? "Replace" : kind === "headline" || kind === "cta" ? "Add to canvas" : "Copy"}</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
