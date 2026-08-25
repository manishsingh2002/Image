import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Heart, LayoutTemplate, SearchX, Wand2 } from "lucide-react";
import { AppHeader } from "../components/shell";
import DocSVG from "../components/DocSVG";
import { Badge, Button, EmptyState, IconBtn, Modal, SearchInput, SelectBox, Toasts } from "../components/ui";
import { CATEGORIES, PLATFORMS } from "../lib/constants";
import { TEMPLATES } from "../lib/templateFactory";
import type { DesignTemplate } from "../types";
import { useAppStore, useDesignsStore } from "../stores";
import { cx, safeParse } from "../lib/utils";

const favKey = "fs-fav-templates";
const loadFavs = (): string[] => safeParse(localStorage.getItem(favKey), [] as string[]);

export default function TemplatesPage() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const toast = useAppStore((s) => s.toast);
  const createDesign = useDesignsStore((s) => s.createDesign);

  const q = params.get("q") || "";
  const cat = params.get("cat") || "All";
  const platform = params.get("platform") || "All";
  const orientation = params.get("orient") || "All";
  const access = params.get("access") || "All";

  const [favs, setFavs] = useState<string[]>(loadFavs);
  const [preview, setPreview] = useState<DesignTemplate | null>(null);
  const [visible, setVisible] = useState(24);

  useEffect(() => { setVisible(24); }, [q, cat, platform, orientation, access]);

  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v === "All" || !v) p.delete(k); else p.set(k, v);
    setParams(p, { replace: true });
  };

  const results = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const tokens = ql.split(/\s+/).filter(Boolean);
    return TEMPLATES.filter((t) => {
      if (cat !== "All" && t.category !== cat && t.industry !== cat) return false;
      if (platform !== "All" && t.platform !== platform) return false;
      if (orientation === "Square" && t.width !== t.height) return false;
      if (orientation === "Portrait" && t.width >= t.height) return false;
      if (orientation === "Landscape" && t.width <= t.height) return false;
      if (access === "Free" && t.premium) return false;
      if (access === "Pro" && !t.premium) return false;
      if (!tokens.length) return true;
      const hay = `${t.name} ${t.category} ${t.industry} ${t.tags.join(" ")}`.toLowerCase();
      return tokens.every((tok) => hay.includes(tok));
    });
  }, [q, cat, platform, orientation, access]);

  const toggleFav = (id: string) => {
    const next = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id];
    setFavs(next);
    localStorage.setItem(favKey, JSON.stringify(next));
  };

  const useTemplate = (t: DesignTemplate, label = "Design created from template.") => {
    const id = createDesign({ platform: t.platform, template: t });
    toast(label, "success");
    nav(`/editor/${id}`);
  };

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader active="/templates" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 anim-fade-up">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-accent">Template library</p>
            <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight mt-1.5">Start from something beautiful.</h1>
            <p className="text-sub mt-1.5 text-[14px]">{TEMPLATES.length} editable layouts · every one stored as live JSON, not a flat image.</p>
          </div>
          <div className="w-full sm:w-80">
            <SearchInput placeholder="Try “jewellery sale”, “independence day offer”, “restaurant”…" value={q} onChange={(e) => set("q", e.target.value)} />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2.5 mt-6 anim-fade-up" style={{ animationDelay: "80ms" }}>
          <SelectBox ariaLabel="Category" value={cat} onChange={(v) => set("cat", v)} className="w-44"
            options={[{ value: "All", label: "All categories" }, ...CATEGORIES.map((c) => ({ value: c.id, label: c.id }))]} />
          <SelectBox ariaLabel="Platform" value={platform} onChange={(v) => set("platform", v)} className="w-44"
            options={[{ value: "All", label: "All platforms" }, ...PLATFORMS.map((p) => ({ value: p.id, label: p.label }))]} />
          <SelectBox ariaLabel="Orientation" value={orientation} onChange={(v) => set("orient", v)} className="w-36"
            options={["All", "Square", "Portrait", "Landscape"].map((o) => ({ value: o, label: o }))} />
          <SelectBox ariaLabel="Access" value={access} onChange={(v) => set("access", v)} className="w-32"
            options={[{ value: "All", label: "Free + Pro" }, { value: "Free", label: "Free only" }, { value: "Pro", label: "Pro only" }]} />
          {(q || cat !== "All" || platform !== "All" || orientation !== "All" || access !== "All") && (
            <Button variant="ghost" size="sm" className="h-9" onClick={() => setParams({}, { replace: true })}>Clear filters</Button>
          )}
          <span className="ml-auto self-center text-[12.5px] font-semibold text-faint">{results.length} result{results.length === 1 ? "" : "s"}</span>
        </div>

        {/* Grid */}
        {results.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface mt-6">
            <EmptyState icon={<SearchX size={22} />} title="Nothing matches that search."
              body={`We couldn't find templates for “${q}”. Try broader terms like “sale”, “festival” or an industry like “restaurant”.`}
              action={<Button variant="outline" onClick={() => setParams({}, { replace: true })}>Clear all filters</Button>} />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-7 mt-6">
            {results.slice(0, visible).map((t, i) => (
              <div key={t.id} className="group anim-fade-up" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
                <div className="relative rounded-xl overflow-hidden ring-1 ring-black/10 shadow-sm group-hover:shadow-xl transition-all duration-300 cursor-pointer" onClick={() => setPreview(t)}>
                  <DocSVG doc={t.design} width="100%" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100">
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); useTemplate(t); }}><Wand2 size={13} /> Use template</Button>
                  </div>
                  <IconBtn label={favs.includes(t.id) ? "Remove from favorites" : "Add to favorites"} size="sm"
                    className={cx("absolute top-2 right-2 !bg-surface/90 border border-line opacity-0 group-hover:opacity-100", favs.includes(t.id) && "!opacity-100 !text-danger")}
                    onClick={(e) => { e.stopPropagation(); toggleFav(t.id); }}>
                    <Heart size={13} fill={favs.includes(t.id) ? "currentColor" : "none"} />
                  </IconBtn>
                  {t.premium && <span className="absolute top-2 left-2"><Badge tone="gold">Pro</Badge></span>}
                </div>
                <div className="flex items-start justify-between gap-2 mt-2.5 px-0.5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-ink truncate">{t.name}</p>
                    <p className="text-[11px] text-faint mt-0.5">{t.category} · {t.width}×{t.height}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {results.length > visible && (
          <div className="flex justify-center mt-10">
            <Button variant="outline" onClick={() => setVisible((v) => v + 24)}>Load {Math.min(24, results.length - visible)} more</Button>
          </div>
        )}
      </main>

      {/* Preview modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name || ""} width="max-w-3xl"
        subtitle={preview ? `${preview.category} · ${preview.industry} · ${preview.width} × ${preview.height}px` : undefined}
        footer={preview && (
          <>
            <Button variant="ghost" onClick={() => setPreview(null)}>Close</Button>
            <Button onClick={() => preview && useTemplate(preview, "Customize away — everything is editable.")}><Wand2 size={14} /> Customize template</Button>
          </>
        )}>
        {preview && (
          <div className="grid sm:grid-cols-[1fr_220px] gap-5">
            <div className="rounded-xl overflow-hidden ring-1 ring-black/10 shadow-md bg-surface2 flex justify-center">
              <DocSVG doc={preview.design} width={preview.width >= preview.height ? "100%" : 340} />
            </div>
            <div className="space-y-3 text-[13px]">
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint mb-1.5">What's inside</p>
                <ul className="space-y-1.5 text-sub">
                  {["Background", "Image placeholder", "Heading", preview.design.elements.some((e) => e.name === "Offer") ? "Offer badge" : "Description", "CTA", "Decorative elements"].filter((v, i, a) => a.indexOf(v) === i).map((x) => (
                    <li key={x} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent" />{x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-faint mb-1.5">Details</p>
                <p className="text-sub">Platform: <span className="font-semibold text-ink">{PLATFORMS.find((p) => p.id === preview.platform)?.label}</span></p>
                <p className="text-sub mt-1">Access: {preview.premium ? <Badge tone="gold">Pro</Badge> : <Badge tone="accent">Free</Badge>}</p>
              </div>
              <p className="text-[11.5px] text-faint leading-relaxed pt-2 border-t border-line">Using it creates a new editable design — text, image and colours are all yours to change.</p>
            </div>
          </div>
        )}
      </Modal>
      <span className="hidden"><LayoutTemplate size={1} /></span>
    </div>
  );
}
