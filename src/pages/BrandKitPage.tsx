import { useRef } from "react";
import { Check, Palette as PaletteIcon, Type as TypeIcon, Upload } from "lucide-react";
import { AppHeader } from "../components/shell";
import DocSVG from "../components/DocSVG";
import { Button, Field, Input, SelectBox, Toasts } from "../components/ui";
import { FONTS } from "../lib/constants";
import { useAppStore, useBrandStore } from "../stores";
import { processUploadFile } from "../lib/utils";
import type { DesignDocument } from "../types";

const COLOR_SLOTS: { key: keyof ReturnType<typeof useBrandStore.getState>["kit"]["colors"]; label: string; hint: string }[] = [
  { key: "primary", label: "Primary", hint: "Buttons, CTAs, key accents" },
  { key: "secondary", label: "Secondary", hint: "Headings, strong text" },
  { key: "accent", label: "Accent", hint: "Highlights, badges, offers" },
  { key: "background", label: "Background", hint: "Canvas base tone" },
];

export default function BrandKitPage() {
  const toast = useAppStore((s) => s.toast);
  const { kit, setKit, setColor, setFont, setLogo } = useBrandStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const onLogo = async (f: File | undefined) => {
    if (!f) return;
    try {
      const { dataUrl } = await processUploadFile(f, 600);
      setLogo(dataUrl);
      toast("Brand logo saved.", "success");
    } catch (e) { toast(e instanceof Error ? e.message : "Unable to upload image. Please try another file.", "error"); }
  };

  const previewDoc: DesignDocument = {
    width: 1080, height: 1080,
    background: { type: "solid", color: kit.colors.background },
    elements: [
      { id: "pv1", type: "rect", name: "Bar", x: 0, y: 0, width: 1080, height: 18, fill: kit.colors.primary, rotation: 0, opacity: 1, visible: true, locked: false },
      ...(kit.logo ? [{ id: "pv2", type: "image" as const, name: "Logo", x: 96, y: 96, width: 160, height: 160, src: kit.logo, rotation: 0, opacity: 1, visible: true, locked: false }] : []),
      { id: "pv3", type: "text", name: "Heading", x: 96, y: 340, width: 880, height: 200, text: "Your brand,\non every post.", fontSize: 108, fontFamily: kit.fonts.heading, fontStyle: "bold", color: kit.colors.secondary, lineHeight: 1.05, align: "left", rotation: 0, opacity: 1, visible: true, locked: false },
      { id: "pv4", type: "text", name: "Body", x: 96, y: 640, width: 780, height: 100, text: "Headings use your display face, body copy uses your reading face, and every accent pulls from the palette on the left.", fontSize: 32, fontFamily: kit.fonts.body, color: kit.colors.secondary, lineHeight: 1.5, align: "left", rotation: 0, opacity: 1, visible: true, locked: false },
      { id: "pv5", type: "rect", name: "CTA", x: 96, y: 830, width: 320, height: 88, radius: 44, fill: kit.colors.primary, rotation: 0, opacity: 1, visible: true, locked: false },
      { id: "pv6", type: "text", name: "CTA text", x: 96, y: 856, width: 320, height: 40, text: "SHOP NOW", fontSize: 30, fontFamily: kit.fonts.body, fontStyle: "bold", color: kit.colors.background, align: "center", letterSpacing: 2, rotation: 0, opacity: 1, visible: true, locked: false },
      { id: "pv7", type: "ellipse", name: "Dot", x: 880, y: 830, width: 88, height: 88, fill: kit.colors.accent, rotation: 0, opacity: 1, visible: true, locked: false },
    ],
  };

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader active="/brand-kit" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="anim-fade-up">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-accent">Brand Kit</p>
          <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight mt-1.5">One kit. Every design on-brand.</h1>
          <p className="text-sub mt-1.5 text-[14px] max-w-xl">Save your logo, palette and type pairing once — then apply them inside the editor with a single click.</p>
        </div>

        <div className="grid lg:grid-cols-[1fr_420px] gap-6 mt-8 items-start">
          <div className="space-y-5">
            {/* Identity */}
            <section className="rounded-2xl border border-line bg-surface p-5 anim-fade-up" style={{ animationDelay: "60ms" }}>
              <h2 className="font-display font-bold text-[16px] flex items-center gap-2"><Upload size={16} className="text-accent" /> Logo & identity</h2>
              <div className="flex flex-wrap items-center gap-4 mt-4">
                <button onClick={() => fileRef.current?.click()}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-line2 hover:border-accent bg-surface2 flex items-center justify-center overflow-hidden transition-colors cursor-pointer"
                  aria-label="Upload logo">
                  {kit.logo
                    ? <img src={kit.logo} alt="Brand logo" className="w-full h-full object-contain p-2" />
                    : <span className="flex flex-col items-center gap-1 text-faint text-[10.5px] font-bold"><Upload size={18} />UPLOAD</span>}
                </button>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} />
                <div className="flex-1 min-w-52">
                  <Field label="Brand name"><Input value={kit.name} onChange={(e) => setKit({ name: e.target.value })} /></Field>
                  <div className="flex gap-2 mt-3">
                    {kit.logo && <Button variant="outline" size="sm" onClick={() => { setLogo(null); toast("Logo removed.", "info"); }}>Remove logo</Button>}
                    <span className="text-[11.5px] text-faint self-center">PNG, JPG, WebP or SVG · stored locally</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Colors */}
            <section className="rounded-2xl border border-line bg-surface p-5 anim-fade-up" style={{ animationDelay: "120ms" }}>
              <h2 className="font-display font-bold text-[16px] flex items-center gap-2"><PaletteIcon size={16} className="text-accent" /> Brand colors</h2>
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                {COLOR_SLOTS.map((c) => (
                  <div key={c.key}>
                    <div className="flex items-center gap-2.5">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-line shrink-0" style={{ background: kit.colors[c.key] }}>
                        <input type="color" aria-label={`${c.label} color`} value={kit.colors[c.key]} onChange={(e) => { setColor(c.key, e.target.value); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-bold text-ink">{c.label}</p>
                        <p className="text-[11px] text-faint">{c.hint}</p>
                      </div>
                      <input value={kit.colors[c.key]} onChange={(e) => setColor(c.key, e.target.value)}
                        className="w-24 h-8 px-2 rounded-md bg-surface2 border border-line text-[12px] font-mono text-ink focus:border-accent focus:outline-none" aria-label={`${c.label} hex value`} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Fonts */}
            <section className="rounded-2xl border border-line bg-surface p-5 anim-fade-up" style={{ animationDelay: "180ms" }}>
              <h2 className="font-display font-bold text-[16px] flex items-center gap-2"><TypeIcon size={16} className="text-accent" /> Brand fonts</h2>
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <Field label="Heading font">
                  <SelectBox value={kit.fonts.heading} onChange={(v) => setFont("heading", v)} ariaLabel="Heading font"
                    options={FONTS.map((f) => ({ value: f.family, label: f.family }))} />
                  <p className="mt-2 text-[22px] leading-snug text-ink" style={{ fontFamily: `'${kit.fonts.heading}', sans-serif`, fontWeight: 700 }}>Aa — Make it memorable</p>
                </Field>
                <Field label="Body font">
                  <SelectBox value={kit.fonts.body} onChange={(v) => setFont("body", v)} ariaLabel="Body font"
                    options={FONTS.map((f) => ({ value: f.family, label: f.family }))} />
                  <p className="mt-2 text-[15px] leading-relaxed text-sub" style={{ fontFamily: `'${kit.fonts.body}', sans-serif` }}>The quick brown fox jumps over the lazy dog — 0123456789.</p>
                </Field>
              </div>
            </section>

            <div className="flex items-center gap-2.5 text-[12.5px] text-sub bg-accent/6 border border-accent/20 rounded-xl px-4 py-3 anim-fade-up" style={{ animationDelay: "240ms" }}>
              <Check size={15} className="text-accent shrink-0" />
              Kit saved automatically. Inside the editor, open the <span className="font-bold text-ink">Brand</span> tab to apply colours, fonts and your logo to any design.
            </div>
          </div>

          {/* Live preview */}
          <aside className="lg:sticky lg:top-24 anim-fade-up" style={{ animationDelay: "140ms" }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-faint mb-3">Live preview</p>
            <div className="rounded-2xl overflow-hidden ring-1 ring-black/10 shadow-xl shadow-black/8">
              <DocSVG doc={previewDoc} width="100%" />
            </div>
            <div className="flex gap-2 mt-4">
              {Object.entries(kit.colors).map(([k, v]) => (
                <div key={k} className="flex-1">
                  <div className="h-10 rounded-lg border border-line" style={{ background: v }} />
                  <p className="text-[10px] font-bold text-faint mt-1 text-center uppercase">{k}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
