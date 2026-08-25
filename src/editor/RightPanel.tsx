import { useRef, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical, Crop, Expand, FlipHorizontal, Italic, Replace, Sparkles, Trash2, Type, Underline, Strikethrough, Upload } from "lucide-react";
import { Button, ColorInput, Field, NumInput, SelectBox, SliderRow, TextArea, Toggle } from "../components/ui";
import { FONTS, fontByFamily } from "../lib/constants";
import { coverCrop, smartResizeDoc, processUploadFile, loadImage } from "../lib/utils";
import { useAppStore, useEditorStore } from "../stores";
import { CropModal, ResizeModal } from "./EditorModals";
import type { DesignElement } from "../types";

const BLENDS = ["source-over", "multiply", "screen", "overlay", "darken", "lighten"];
const WEIGHTS = [{ v: "normal", l: "Regular" }, { v: "bold", l: "Bold" }];

export default function RightPanel() {
  const doc = useEditorStore((s) => s.doc);
  const selection = useEditorStore((s) => s.selection);
  const updateElements = useEditorStore((s) => s.updateElements);
  const setDoc = useEditorStore((s) => s.setDoc);
  const removeElements = useEditorStore((s) => s.removeElements);
  const addElements = useEditorStore((s) => s.addElements);
  const showGrid = useEditorStore((s) => s.showGrid);
  const showSafeZones = useEditorStore((s) => s.showSafeZones);
  const toggleGrid = useEditorStore((s) => s.toggleGrid);
  const toggleSafeZones = useEditorStore((s) => s.toggleSafeZones);
  const setEditingText = useEditorStore((s) => s.setEditingText);
  const toast = useAppStore((s) => s.toast);

  const [cropOpen, setCropOpen] = useState(false);
  const [resizeOpen, setResizeOpen] = useState(false);
  const replaceRef = useRef<HTMLInputElement>(null);

  if (!doc) return null;
  const sel = doc.elements.filter((e) => selection.includes(e.id));
  const one = sel.length === 1 ? sel[0] : null;
  const up = (patch: Partial<DesignElement>) => one && updateElements([one.id], (e) => ({ ...e, ...patch }));

  const replaceImage = async (f: File | undefined) => {
    if (!f || !one) return;
    try {
      const { dataUrl, w, h } = await processUploadFile(f);
      const width = one.width;
      const height = Math.round(width * (h / w));
      updateElements([one.id], (e) => ({ ...e, src: dataUrl, crop: null, height, filters: { brightness: 0, contrast: 0, saturation: 0, blur: 0 } }));
      toast("Image replaced.", "success");
    } catch (e) { toast(e instanceof Error ? e.message : "Unable to upload image. Please try another file.", "error"); }
  };

  const mirror = async () => {
    if (!one || one.type !== "image" || !one.src) return;
    try {
      const img = await loadImage(one.src);
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const cur = one.crop || { sx: 0, sy: 0, sw: iw, sh: ih };
      up({ crop: { ...cur, sx: iw - cur.sx - cur.sw, iw, ih } });
      toast("Image mirrored.", "success");
    } catch { toast("Couldn't mirror this image.", "error"); }
  };

  // ── Multi-select ──
  if (sel.length > 1) {
    const align = (fn: (e: DesignElement) => Partial<DesignElement>) => updateElements(sel.map((e) => e.id), (e) => ({ ...e, ...fn(e) }));
    return (
      <aside className="w-[264px] shrink-0 border-l border-line bg-surface p-4 overflow-y-auto">
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint">{sel.length} elements selected</p>
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint mt-5 mb-2">Align to canvas</p>
        <div className="grid grid-cols-3 gap-1.5">
          <AlignBtn label="Align left" onClick={() => align((e) => ({ x: 0 }))}><AlignLeft size={15} /></AlignBtn>
          <AlignBtn label="Center horizontally" onClick={() => align((e) => ({ x: (doc.width - e.width) / 2 }))}><AlignCenter size={15} /></AlignBtn>
          <AlignBtn label="Align right" onClick={() => align((e) => ({ x: doc.width - e.width }))}><AlignRight size={15} /></AlignBtn>
          <AlignBtn label="Align top" onClick={() => align((e) => ({ y: 0 }))}><AlignStartVertical size={15} /></AlignBtn>
          <AlignBtn label="Center vertically" onClick={() => align((e) => ({ y: (doc.height - e.height) / 2 }))}><AlignCenterVertical size={15} /></AlignBtn>
          <AlignBtn label="Align bottom" onClick={() => align((e) => ({ y: doc.height - e.height }))}><AlignEndVertical size={15} /></AlignBtn>
        </div>
        <div className="flex gap-2 mt-5">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => addElements(sel.map((e) => ({ ...e, id: `${e.id}-c${Date.now()}`.replace(/[^a-z0-9-]/gi, "x"), x: e.x + 28, y: e.y + 28 })))}>Duplicate</Button>
          <Button size="sm" variant="danger" className="flex-1" onClick={() => removeElements(sel.map((e) => e.id))}><Trash2 size={13} /> Delete</Button>
        </div>
        <p className="text-[11px] text-faint mt-4 leading-relaxed">Shift-click to extend the selection. Grouping ships with the collaboration update.</p>
      </aside>
    );
  }

  // ── Canvas properties ──
  if (!one) {
    const ratio = doc.width / doc.height;
    const ratioName = Math.abs(ratio - 1) < 0.02 ? "Square" : ratio > 1.3 ? "Landscape" : ratio < 0.75 ? "Portrait" : "Classic";
    return (
      <aside className="w-[264px] shrink-0 border-l border-line bg-surface p-4 overflow-y-auto">
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint">Canvas</p>
        <div className="mt-3 p-3.5 rounded-xl border border-line bg-surface2/40">
          <p className="font-display font-bold text-[17px] text-ink">{doc.width} × {doc.height}</p>
          <p className="text-[11.5px] text-faint mt-0.5">{ratioName} · {doc.elements.length} element{doc.elements.length === 1 ? "" : "s"}</p>
        </div>
        <div className="mt-4 space-y-1">
          <Toggle checked={showGrid} onChange={toggleGrid} label="Show grid (100px)" />
          <Toggle checked={showSafeZones} onChange={toggleSafeZones} label="Show safe zones" />
        </div>
        <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => setResizeOpen(true)}><Expand size={14} /> Resize design</Button>
        <div className="mt-5 p-3.5 rounded-xl border border-line bg-accent/4">
          <p className="text-[12px] font-bold text-ink flex items-center gap-1.5"><Sparkles size={13} className="text-accent" /> Tip</p>
          <p className="text-[11.5px] text-sub leading-relaxed mt-1">Select any element to edit its properties. Double-click text to type directly on the canvas.</p>
        </div>
        {ratio < 0.8 && (
          <p className="text-[11px] text-faint leading-relaxed mt-4">Story format detected — keep key content inside the safe zones so platform UI never covers it.</p>
        )}
        <ResizeModal open={resizeOpen} onClose={() => setResizeOpen(false)} doc={doc}
          onApply={(w, h) => { setDoc(smartResizeDoc(doc, w, h)); toast(`Resized to ${w} × ${h} — layout adapted.`, "success"); }} />
      </aside>
    );
  }

  // ── Single element ──
  const isText = one.type === "text";
  const isImage = one.type === "image";
  const isShape = one.type === "rect" || one.type === "ellipse" || one.type === "path";
  const bold = (one.fontStyle || "").includes("bold");
  const italic = (one.fontStyle || "").includes("italic");
  const f = one.filters || { brightness: 0, contrast: 0, saturation: 0, blur: 0 };

  return (
    <aside className="w-[264px] shrink-0 border-l border-line bg-surface overflow-y-auto">
      <div className="p-4 border-b border-line flex items-center justify-between">
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint">{one.name}</p>
        <span className="text-[10px] font-bold text-accent bg-accent/10 rounded px-1.5 py-0.5 uppercase">{one.type}</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Arrange */}
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint mb-2">Arrange</p>
          <div className="grid grid-cols-2 gap-2">
            <NumInput label="X" value={one.x} onChange={(v) => up({ x: Math.round(v) })} />
            <NumInput label="Y" value={one.y} onChange={(v) => up({ y: Math.round(v) })} />
            <NumInput label="W" value={one.width} min={2} onChange={(v) => up({ width: Math.max(2, Math.round(v)) })} />
            <NumInput label="H" value={one.height} min={2} onChange={(v) => up({ height: Math.max(2, Math.round(v)) })} />
          </div>
          <div className="mt-3 space-y-3">
            <SliderRow label="Rotation" value={one.rotation} min={-180} max={180} onChange={(v) => up({ rotation: v })} format={(v) => `${v}°`} />
            <SliderRow label="Opacity" value={Math.round(one.opacity * 100)} min={0} max={100} onChange={(v) => up({ opacity: v / 100 })} format={(v) => `${v}%`} />
            {(isShape || isImage) && (
              <Field label="Blend mode">
                <SelectBox value={one.blend || "source-over"} onChange={(v) => up({ blend: v })} ariaLabel="Blend mode"
                  options={BLENDS.map((b) => ({ value: b, label: b === "source-over" ? "Normal" : b[0].toUpperCase() + b.slice(1) }))} />
              </Field>
            )}
          </div>
        </div>

        {/* Text */}
        {isText && (
          <>
            <Section title="Typography">
              <TextArea rows={3} value={one.text || ""} onChange={(e) => up({ text: e.target.value })} aria-label="Text content" />
              <div className="grid grid-cols-[1fr_74px] gap-2 mt-2">
                <Field label="Font">
                  <SelectBox value={one.fontFamily || "Poppins"} onChange={(v) => up({ fontFamily: v })} ariaLabel="Font family"
                    options={FONTS.map((x) => ({ value: x.family, label: x.family }))} />
                </Field>
                <Field label="Size">
                  <NumInput label="" value={one.fontSize || 24} min={6} onChange={(v) => up({ fontSize: Math.max(6, Math.round(v)) })} />
                </Field>
              </div>
              <div className="flex gap-1.5 mt-2">
                <SelectBox value={bold ? "bold" : "normal"} onChange={(v) => up({ fontStyle: `${v === "bold" ? "bold" : ""}${italic ? " italic" : ""}`.trim() || "normal" })} ariaLabel="Weight" className="flex-1" options={WEIGHTS.map((w) => ({ value: w.v, label: w.l }))} />
                <ToolBtn label="Italic" active={italic} onClick={() => up({ fontStyle: `${bold ? "bold" : ""}${!italic ? " italic" : ""}`.trim() || "normal" })}><Italic size={14} /></ToolBtn>
                <ToolBtn label="Underline" active={one.textDecoration === "underline"} onClick={() => up({ textDecoration: one.textDecoration === "underline" ? "" : "underline" })}><Underline size={14} /></ToolBtn>
                <ToolBtn label="Strikethrough" active={one.textDecoration === "line-through"} onClick={() => up({ textDecoration: one.textDecoration === "line-through" ? "" : "line-through" })}><Strikethrough size={14} /></ToolBtn>
              </div>
              <div className="flex gap-1.5 mt-2">
                {(["left", "center", "right"] as const).map((a) => (
                  <ToolBtn key={a} label={`Align ${a}`} active={one.align === a} onClick={() => up({ align: a })} grow>
                    {a === "left" ? <AlignLeft size={14} /> : a === "center" ? <AlignCenter size={14} /> : <AlignRight size={14} />}
                  </ToolBtn>
                ))}
                <Button size="sm" variant="outline" className="flex-1 !h-8 text-[11px]" onClick={() => up({ text: (one.text || "").toUpperCase() })}>AA</Button>
              </div>
              <div className="mt-3 space-y-3">
                <SliderRow label="Letter spacing" value={one.letterSpacing || 0} min={-4} max={30} onChange={(v) => up({ letterSpacing: v })} format={(v) => `${v}px`} />
                <SliderRow label="Line height" value={one.lineHeight || 1.2} min={0.7} max={2.6} step={0.05} onChange={(v) => up({ lineHeight: v })} format={(v) => v.toFixed(2)} />
              </div>
              <Field label="Color"><div className="mt-1"><ColorInput value={one.color || "#111111"} onChange={(v) => up({ color: v })} /></div></Field>
              <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => setEditingText(one.id)}><Type size={13} /> Edit on canvas</Button>
            </Section>
          </>
        )}

        {/* Image */}
        {isImage && (
          <>
            <Section title="Image">
              <div className="grid grid-cols-2 gap-1.5">
                <Button size="sm" variant="outline" onClick={() => setCropOpen(true)}><Crop size={13} /> Crop</Button>
                <Button size="sm" variant="outline" onClick={mirror}><FlipHorizontal size={13} /> Mirror</Button>
                <Button size="sm" variant="outline" className="col-span-2" onClick={() => replaceRef.current?.click()}><Replace size={13} /> Replace image</Button>
                <input ref={replaceRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" onChange={(e) => { replaceImage(e.target.files?.[0]); e.target.value = ""; }} />
              </div>
              <SliderRow label="Fit zoom" value={one.crop?.iw ? Math.round(100 * Math.min(one.crop.iw / one.crop.sw, (one.crop.ih || 1) / one.crop.sh)) : 100} min={100} max={300}
                onChange={async (v) => {
                  let c = one.crop;
                  if (!c && one.src) {
                    try { const img = await loadImage(one.src); c = { sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight, iw: img.naturalWidth, ih: img.naturalHeight }; } catch { return; }
                  }
                  if (!c?.iw || !c.ih) return;
                  const cxr = (c.sx + c.sw / 2) / c.iw, cyr = (c.sy + c.sh / 2) / c.ih;
                  up({ crop: { ...coverCrop(c.iw, c.ih, one.width, one.height, cxr, cyr, v / 100), iw: c.iw, ih: c.ih } });
                }} format={(v) => `${v}%`} />
              <p className="text-[10.5px] text-faint -mt-1">Zooms the photo inside its frame — fine-tune framing in the crop tool.</p>
            </Section>
            <Section title="Adjust">
              <div className="space-y-3">
                <SliderRow label="Brightness" value={Math.round(f.brightness * 100)} min={-100} max={100} onChange={(v) => up({ filters: { ...f, brightness: v / 100 } })} format={(v) => `${v}`} />
                <SliderRow label="Contrast" value={Math.round(f.contrast * 100)} min={-100} max={100} onChange={(v) => up({ filters: { ...f, contrast: v / 100 } })} format={(v) => `${v}`} />
                <SliderRow label="Saturation" value={Math.round(f.saturation * 100)} min={-100} max={100} onChange={(v) => up({ filters: { ...f, saturation: v / 100 } })} format={(v) => `${v}`} />
                <SliderRow label="Blur" value={Math.round(f.blur)} min={0} max={20} onChange={(v) => up({ filters: { ...f, blur: v } })} format={(v) => `${v}px`} />
                <Button size="xs" variant="ghost" className="w-full" onClick={() => up({ filters: { brightness: 0, contrast: 0, saturation: 0, blur: 0 } })}>Reset adjustments</Button>
              </div>
            </Section>
            <Section title="Corner radius">
              <SliderRow label="Radius" value={one.radius || 0} min={0} max={Math.round(Math.min(one.width, one.height) / 2)} onChange={(v) => up({ radius: v })} format={(v) => `${v}px`} />
            </Section>
            <div className="p-3 rounded-xl border border-dashed border-line2 bg-surface2/40">
              <p className="text-[11.5px] font-bold text-sub flex items-center gap-1.5"><Sparkles size={12} className="text-accent" /> Remove background</p>
              <p className="text-[11px] text-faint mt-1 leading-relaxed">Coming soon — needs an AI provider connection. The <code className="font-mono">ImageIntelligence</code> service slot is ready.</p>
              <Button size="xs" variant="outline" className="mt-2" disabled onClick={() => {}}>Connect AI provider</Button>
            </div>
          </>
        )}

        {/* Shape */}
        {isShape && (
          <>
            <Section title="Fill">
              {typeof one.fill === "string" ? (
                <ColorInput value={one.fill === "transparent" ? "#ffffff" : one.fill} onChange={(v) => up({ fill: v })} />
              ) : (
                <p className="text-[11.5px] text-faint">Gradient fill — edit via the Background tab presets or element styles.</p>
              )}
            </Section>
            {one.type === "rect" && (
              <Section title="Corner radius">
                <SliderRow label="Radius" value={one.radius || 0} min={0} max={Math.round(Math.min(one.width, one.height) / 2)} onChange={(v) => up({ radius: v })} format={(v) => `${v}px`} />
              </Section>
            )}
            {one.type !== "path" && (
              <Section title="Border">
                <div className="flex items-center gap-2">
                  <input type="color" aria-label="Border color" value={one.stroke || "#1b1d21"} onChange={(e) => up({ stroke: e.target.value, strokeWidth: one.strokeWidth || 3 })} className="w-9 h-9 rounded-lg cursor-pointer" />
                  <SliderRow label="Width" value={one.strokeWidth || 0} min={0} max={40} onChange={(v) => up({ strokeWidth: v, stroke: one.stroke || "#1b1d21" })} format={(v) => `${v}px`} />
                </div>
              </Section>
            )}
            <Section title="Shadow">
              <Toggle checked={!!one.shadow && one.shadow.blur > 0} onChange={() => up({ shadow: one.shadow ? null : { color: "#000000", blur: 30, offsetX: 0, offsetY: 10, opacity: 0.35 } })} label="Drop shadow" />
              {one.shadow && (
                <div className="space-y-3 mt-2">
                  <SliderRow label="Blur" value={one.shadow.blur} min={0} max={120} onChange={(v) => up({ shadow: { ...one.shadow!, blur: v } })} format={(v) => `${v}px`} />
                  <SliderRow label="Offset Y" value={one.shadow.offsetY} min={-60} max={60} onChange={(v) => up({ shadow: { ...one.shadow!, offsetY: v } })} format={(v) => `${v}px`} />
                  <SliderRow label="Strength" value={Math.round(one.shadow.opacity * 100)} min={0} max={100} onChange={(v) => up({ shadow: { ...one.shadow!, opacity: v / 100 } })} format={(v) => `${v}%`} />
                </div>
              )}
            </Section>
          </>
        )}

        {one.type === "line" && (
          <Section title="Stroke">
            <div className="flex items-center gap-2">
              <input type="color" aria-label="Line color" value={one.stroke || "#1b1d21"} onChange={(e) => up({ stroke: e.target.value })} className="w-9 h-9 rounded-lg cursor-pointer" />
              <SliderRow label="Width" value={one.strokeWidth || 2} min={1} max={40} onChange={(v) => up({ strokeWidth: v })} format={(v) => `${v}px`} />
            </div>
            <Toggle checked={!!one.dash} onChange={() => up({ dash: one.dash ? undefined : [18, 14] })} label="Dashed" />
          </Section>
        )}

        {/* Danger */}
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => addElements([{ ...one, id: `${one.id}c${Date.now()}`.replace(/[^a-z0-9]/gi, "x"), x: one.x + 28, y: one.y + 28 }])}>Duplicate</Button>
          <Button size="sm" variant="danger" className="flex-1" onClick={() => removeElements([one.id])}><Trash2 size={13} /> Delete</Button>
        </div>
        <p className="text-[10.5px] text-faint">{fontByFamily(one.fontFamily || "")?.category || ""} {isText ? `· ${one.fontSize}px` : ""}</p>
      </div>

      {isImage && <CropModal open={cropOpen} onClose={() => setCropOpen(false)} el={one} onApply={(crop) => up({ crop })} />}
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pt-4 border-t border-line first:border-0 first:pt-0">
      <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint mb-2.5">{title}</p>
      {children}
    </div>
  );
}

function ToolBtn({ label, active, onClick, children, grow }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode; grow?: boolean }) {
  return (
    <button aria-label={label} title={label} onClick={onClick}
      className={`${grow ? "flex-1" : "w-8"} h-8 flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${active ? "border-accent bg-accent/10 text-accent" : "border-line text-sub hover:bg-surface2"}`}>
      {children}
    </button>
  );
}

function AlignBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button aria-label={label} title={label} onClick={onClick}
      className="h-9 flex items-center justify-center rounded-lg border border-line text-sub hover:bg-surface2 hover:text-ink transition-colors cursor-pointer">
      {children}
    </button>
  );
}

export { Upload };
