import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Copy, Download, FileImage, FolderOpen, Layers, MoreHorizontal, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { AppHeader, CreateModal } from "../components/shell";
import DocSVG from "../components/DocSVG";
import { Button, EmptyState, IconBtn, Input, Menu, Modal, Toasts } from "../components/ui";
import { CATEGORIES, QUICK_SIZES, PLATFORMS, platformById } from "../lib/constants";
import { TEMPLATES } from "../lib/templateFactory";
import { renderDocument } from "../lib/exporter";
import { useAppStore, useDesignsStore } from "../stores";
import { cx, downloadDataUrl, timeAgo } from "../lib/utils";

export default function Dashboard() {
  const nav = useNavigate();
  const user = useAppStore((s) => s.user);
  const toast = useAppStore((s) => s.toast);
  const { designs, patch, duplicate, moveToTrash, toggleFavorite } = useDesignsStore();
  const createDesign = useDesignsStore((s) => s.createDesign);
  const [createOpen, setCreateOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [exportingId, setExportingId] = useState<string | null>(null);

  const recent = useMemo(() => designs.filter((d) => !d.trashed).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8), [designs]);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const renameTarget = designs.find((d) => d.id === renameId);
  const fresh = TEMPLATES.slice(0, 6);

  const quickDownload = async (id: string) => {
    const d = designs.find((x) => x.id === id);
    if (!d) return;
    setExportingId(id);
    try {
      const url = await renderDocument(d.doc, { scale: 1, format: "png", quality: 0.92, transparent: false });
      downloadDataUrl(url, `${d.name.replace(/\s+/g, "-").toLowerCase()}.png`);
      toast("PNG downloaded.", "success");
    } catch {
      toast("Export failed. Please try again.", "error");
    } finally { setExportingId(null); }
  };

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader active="/dashboard" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Greeting */}
        <div className="flex flex-wrap items-end justify-between gap-4 anim-fade-up">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-accent">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
            <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight mt-1.5">
              {greeting}{user ? `, ${user.name.split(" ")[0]}` : ""}.
            </h1>
            <p className="text-sub mt-1.5 text-[14.5px]">What are we posting today?</p>
          </div>
          <Button size="lg" onClick={() => setCreateOpen(true)}><Plus size={17} /> Create a design</Button>
        </div>

        {/* Quick create */}
        <section className="mt-8" aria-label="Quick create">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-faint mb-3">Quick create</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {QUICK_SIZES.map((pid, i) => {
              const p = platformById(pid)!;
              const r = p.width / p.height;
              return (
                <button key={pid} onClick={() => nav(`/editor/${createDesign({ platform: pid })}`)}
                  className="group flex flex-col items-center gap-2.5 p-4 rounded-xl border border-line bg-surface hover:border-accent hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/8 transition-all duration-200 cursor-pointer anim-fade-up"
                  style={{ animationDelay: `${i * 45}ms` }}>
                  <span className={cx("rounded-[4px] border-2 border-line2 group-hover:border-accent transition-colors bg-surface2", r >= 1.4 ? "w-11 h-7" : r <= 0.7 ? "w-6 h-10" : "w-9 h-9")} />
                  <span className="text-center">
                    <span className="block text-[12.5px] font-bold text-ink leading-tight">{p.label}</span>
                    <span className="block text-[10.5px] text-faint mt-0.5">{p.width}×{p.height}</span>
                  </span>
                </button>
              );
            })}
            <button onClick={() => setCreateOpen(true)}
              className="group flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border-2 border-dashed border-line2 hover:border-accent hover:bg-accent/4 transition-all cursor-pointer anim-fade-up"
              style={{ animationDelay: "270ms" }}>
              <span className="w-9 h-9 rounded-lg bg-surface2 group-hover:bg-accent/12 text-sub group-hover:text-accent flex items-center justify-center transition-colors"><Plus size={18} /></span>
              <span className="text-[12.5px] font-bold text-ink">Custom size</span>
            </button>
          </div>
        </section>

        {/* Recent designs */}
        <section className="mt-12" aria-label="Recent designs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-faint">Recent designs</h2>
            {designs.some((d) => !d.trashed) && (
              <Link to="/projects" className="text-[12.5px] font-bold text-accent flex items-center gap-1 hover:gap-2 transition-all">All projects <ArrowUpRight size={13} /></Link>
            )}
          </div>

          {recent.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface">
              <EmptyState icon={<FileImage size={22} />} title="You haven't created any designs yet."
                body="Start from a platform preset or a ready-made template — your first professional post is about two minutes away."
                action={<div className="flex gap-2.5"><Button onClick={() => setCreateOpen(true)}><Plus size={15} /> Create your first design</Button>
                  <Button variant="outline" onClick={() => nav("/templates")}>Browse templates</Button></div>} />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {recent.map((d) => (
                <div key={d.id} className="group rounded-xl border border-line bg-surface overflow-hidden hover:border-line2 hover:shadow-xl hover:shadow-black/6 hover:-translate-y-0.5 transition-all duration-200">
                  <button onClick={() => nav(`/editor/${d.id}`)} className="block w-full cursor-pointer relative" aria-label={`Open ${d.name}`}>
                    <div className="w-full aspect-square bg-surface2 flex items-center justify-center overflow-hidden">
                      <DocSVG doc={d.doc} width="82%" className="shadow-md rounded-sm transition-transform duration-300 group-hover:scale-[1.03]" />
                    </div>
                  </button>
                  <div className="p-3 flex items-start gap-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-ink truncate">{d.name}</p>
                      <p className="text-[11px] text-faint mt-0.5">{platformById(d.platform)?.label || "Custom"} · {d.doc.width}×{d.doc.height} · {timeAgo(d.updatedAt)}</p>
                    </div>
                    <IconBtn label="Toggle favorite" size="sm" onClick={() => toggleFavorite(d.id)} className={cx(d.favorite && "!text-gold")}><Star size={14} fill={d.favorite ? "currentColor" : "none"} /></IconBtn>
                    <Menu
                      trigger={<IconBtn label="More actions" size="sm"><MoreHorizontal size={15} /></IconBtn>}
                      items={[
                        { label: "Open", icon: <FolderOpen size={14} />, onClick: () => nav(`/editor/${d.id}`) },
                        { label: "Rename", icon: <Pencil size={14} />, onClick: () => { setRenameId(d.id); setRenameVal(d.name); } },
                        { label: "Duplicate", icon: <Copy size={14} />, onClick: () => { duplicate(d.id); toast("Design duplicated.", "success"); } },
                        { label: exportingId === d.id ? "Rendering…" : "Download PNG", icon: <Download size={14} />, onClick: () => quickDownload(d.id) },
                        { label: "Delete", icon: <Trash2 size={14} />, danger: true, onClick: () => { moveToTrash(d.id); toast("Moved to trash.", "info"); } },
                      ]}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Categories */}
        <section className="mt-12" aria-label="Template categories">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-faint">Template categories</h2>
            <Link to="/templates" className="text-[12.5px] font-bold text-accent flex items-center gap-1 hover:gap-2 transition-all">View library <ArrowUpRight size={13} /></Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const count = TEMPLATES.filter((t) => t.category === c.id || t.industry === c.id).length;
              return (
                <button key={c.id} onClick={() => nav(`/templates?cat=${encodeURIComponent(c.id)}`)}
                  className="flex items-center gap-2 pl-2.5 pr-3.5 py-2 rounded-full border border-line bg-surface hover:border-accent hover:text-accent transition-colors text-[13px] font-semibold text-ink cursor-pointer">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.hue }} />
                  {c.id} <span className="text-faint font-medium text-[11.5px]">{count || "+"}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Fresh templates */}
        <section className="mt-12 pb-8" aria-label="Fresh templates">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-faint mb-3">Fresh from the library</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {fresh.map((t) => (
              <button key={t.id}
                onClick={() => nav(`/editor/${createDesign({ platform: t.platform, template: t })}`)}
                className="group text-left cursor-pointer">
                <div className="rounded-xl overflow-hidden ring-1 ring-black/10 shadow-sm group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300">
                  <DocSVG doc={t.design} width="100%" />
                </div>
                <p className="text-[12.5px] font-bold text-ink mt-2 truncate">{t.name}</p>
                <p className="text-[10.5px] text-faint">{t.category} · tap to use</p>
              </button>
            ))}
          </div>
        </section>
      </main>

      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <Modal open={!!renameId} onClose={() => setRenameId(null)} title="Rename design" footer={
        <>
          <Button variant="ghost" onClick={() => setRenameId(null)}>Cancel</Button>
          <Button onClick={() => { if (renameId && renameVal.trim()) { patch(renameId, { name: renameVal.trim() }); toast("Design renamed.", "success"); } setRenameId(null); }}>Save name</Button>
        </>
      }>
        <Input autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && renameId && renameVal.trim()) { patch(renameId, { name: renameVal.trim() }); setRenameId(null); } }}
          aria-label="Design name" />
        {renameTarget && <p className="text-[11.5px] text-faint mt-2">{renameTarget.doc.width} × {renameTarget.doc.height}px · created {timeAgo(renameTarget.createdAt)}</p>}
      </Modal>
      <span className="hidden"><Layers size={1} /></span>
    </div>
  );
}
