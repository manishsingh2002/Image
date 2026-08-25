import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, Copy, Download, FileImage, FolderOpen, Heart, Link2, MoreHorizontal, Pencil, RotateCcw, Share2, Star, Trash2 } from "lucide-react";
import { AppHeader, CreateModal } from "../components/shell";
import DocSVG from "../components/DocSVG";
import { Badge, Button, EmptyState, IconBtn, Input, Menu, Modal, Seg, SelectBox, Toasts } from "../components/ui";
import { platformById } from "../lib/constants";
import { renderDocument } from "../lib/exporter";
import { useAppStore, useDesignsStore } from "../stores";
import { cx, downloadDataUrl, fmtDate, timeAgo } from "../lib/utils";

type Tab = "all" | "recent" | "favorites" | "shared" | "trash";

export default function ProjectsPage() {
  const nav = useNavigate();
  const toast = useAppStore((s) => s.toast);
  const shares = useAppStore((s) => s.shares);
  const addShare = useAppStore((s) => s.addShare);
  const { designs, patch, duplicate, moveToTrash, restore, purge, toggleFavorite } = useDesignsStore();
  const [tab, setTab] = useState<Tab>("all");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [shareId, setShareId] = useState<string | null>(null);
  const [perm, setPerm] = useState<"view" | "edit">("view");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const list = useMemo(() => {
    const live = designs.filter((d) => !d.trashed);
    const trashed = designs.filter((d) => d.trashed);
    const sharedIds = new Set(shares.map((s) => s.designId));
    switch (tab) {
      case "all": return live;
      case "recent": return [...live].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 12);
      case "favorites": return live.filter((d) => d.favorite);
      case "shared": return live.filter((d) => sharedIds.has(d.id));
      case "trash": return trashed;
    }
  }, [designs, tab, shares]);

  const counts: Record<Tab, number> = {
    all: designs.filter((d) => !d.trashed).length,
    recent: 0, favorites: designs.filter((d) => !d.trashed && d.favorite).length,
    shared: designs.filter((d) => !d.trashed && shares.some((s) => s.designId === d.id)).length,
    trash: designs.filter((d) => d.trashed).length,
  };

  const download = async (id: string) => {
    const d = designs.find((x) => x.id === id);
    if (!d) return;
    try {
      const url = await renderDocument(d.doc, { scale: 2, format: "png", quality: 0.92, transparent: false });
      downloadDataUrl(url, `${d.name.replace(/\s+/g, "-").toLowerCase()}@2x.png`);
      toast("PNG downloaded at 2×.", "success");
    } catch { toast("Export failed. Please try again.", "error"); }
  };

  const doShare = () => {
    if (!shareId) return;
    const link = addShare(shareId, perm);
    const url = `${location.origin}${location.pathname}#/shared/${link.id}`;
    navigator.clipboard?.writeText(url).then(
      () => toast("Share link copied to clipboard.", "success"),
      () => toast(`Share link: ${url}`, "info")
    );
  };

  const tabMeta: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "All designs", icon: <FileImage size={15} /> },
    { id: "recent", label: "Recent", icon: <FolderOpen size={15} /> },
    { id: "favorites", label: "Favorites", icon: <Star size={15} /> },
    { id: "shared", label: "Shared", icon: <Share2 size={15} /> },
    { id: "trash", label: "Trash", icon: <Trash2 size={15} /> },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <AppHeader active="/projects" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 anim-fade-up">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-accent">Projects</p>
            <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight mt-1.5">Everything you've made.</h1>
          </div>
          <div className="flex gap-2.5">
            {tab === "trash" ? (
              <Button variant="outline" onClick={() => { designs.filter((d) => d.trashed).forEach((d) => purge(d.id)); toast("Trash emptied.", "info"); }} disabled={!counts.trash}>
                <Trash2 size={15} /> Empty trash
              </Button>
            ) : (
              <Button onClick={() => setCreateOpen(true)}>New design</Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-6 anim-fade-up" style={{ animationDelay: "70ms" }}>
          {tabMeta.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cx("flex items-center gap-2 px-3.5 py-2 rounded-full border text-[13px] font-semibold transition-colors cursor-pointer",
                tab === t.id ? "bg-ink text-bg border-ink" : "border-line bg-surface text-sub hover:text-ink hover:border-line2")}>
              {t.icon}{t.label}
              {t.id !== "recent" && <span className={cx("text-[10.5px] font-bold px-1.5 py-px rounded-full", tab === t.id ? "bg-white/20" : "bg-surface2 text-faint")}>{counts[t.id]}</span>}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface mt-6">
            <EmptyState icon={<Archive size={22} />}
              title={tab === "trash" ? "Trash is empty." : tab === "favorites" ? "No favorites yet." : tab === "shared" ? "Nothing shared yet." : "No designs here yet."}
              body={tab === "trash" ? "Deleted designs land here before they're gone for good." : tab === "favorites" ? "Star a design to pin it here for fast access." : tab === "shared" ? "Generate a view or edit link from any design's menu." : "Create your first design and it will show up here."}
              action={tab === "all" ? <Button onClick={() => setCreateOpen(true)}>Create your first design</Button> : undefined} />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
            {list.map((d) => (
              <div key={d.id} className={cx("group rounded-xl border bg-surface overflow-hidden transition-all duration-200", d.trashed ? "border-line opacity-75" : "border-line hover:border-line2 hover:shadow-xl hover:shadow-black/6 hover:-translate-y-0.5")}>
                <button onClick={() => !d.trashed && nav(`/editor/${d.id}`)} className="block w-full relative cursor-pointer" aria-label={`Open ${d.name}`} disabled={d.trashed}>
                  <div className="w-full aspect-[4/3] bg-surface2 flex items-center justify-center overflow-hidden">
                    <DocSVG doc={d.doc} width="76%" className="shadow-md rounded-sm" />
                  </div>
                  {d.trashed && <span className="absolute top-2 left-2"><Badge>In trash</Badge></span>}
                </button>
                <div className="p-3">
                  <div className="flex items-start gap-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-ink truncate">{d.name}</p>
                      <p className="text-[11px] text-faint mt-0.5">{platformById(d.platform)?.label || "Custom"} · {d.doc.width}×{d.doc.height}px</p>
                      <p className="text-[10.5px] text-faint mt-0.5">Edited {timeAgo(d.updatedAt)} · Created {fmtDate(d.createdAt)}</p>
                    </div>
                    {d.trashed ? (
                      <div className="flex">
                        <IconBtn label="Restore" size="sm" onClick={() => { restore(d.id); toast("Design restored.", "success"); }}><RotateCcw size={14} /></IconBtn>
                        <IconBtn label="Delete forever" size="sm" onClick={() => setConfirmId(d.id)} className="hover:!text-danger"><Trash2 size={14} /></IconBtn>
                      </div>
                    ) : (
                      <div className="flex">
                        <IconBtn label="Toggle favorite" size="sm" onClick={() => toggleFavorite(d.id)} className={cx(d.favorite && "!text-gold")}><Star size={14} fill={d.favorite ? "currentColor" : "none"} /></IconBtn>
                        <Menu
                          trigger={<IconBtn label="More actions" size="sm"><MoreHorizontal size={15} /></IconBtn>}
                          items={[
                            { label: "Open", icon: <FolderOpen size={14} />, onClick: () => nav(`/editor/${d.id}`) },
                            { label: "Rename", icon: <Pencil size={14} />, onClick: () => { setRenameId(d.id); setRenameVal(d.name); } },
                            { label: "Duplicate", icon: <Copy size={14} />, onClick: () => { duplicate(d.id); toast("Design duplicated.", "success"); } },
                            { label: "Download PNG 2×", icon: <Download size={14} />, onClick: () => download(d.id) },
                            { label: "Share…", icon: <Link2 size={14} />, onClick: () => { setShareId(d.id); setPerm("view"); } },
                            { label: "Delete", icon: <Trash2 size={14} />, danger: true, onClick: () => { moveToTrash(d.id); toast("Moved to trash.", "info"); } },
                          ]}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <Modal open={!!renameId} onClose={() => setRenameId(null)} title="Rename design" footer={
        <>
          <Button variant="ghost" onClick={() => setRenameId(null)}>Cancel</Button>
          <Button onClick={() => { if (renameId && renameVal.trim()) { patch(renameId, { name: renameVal.trim() }); toast("Renamed.", "success"); } setRenameId(null); }}>Save</Button>
        </>
      }>
        <Input autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)} aria-label="Design name" />
      </Modal>

      <Modal open={!!shareId} onClose={() => setShareId(null)} title="Share design" subtitle="Anyone with the link gets the permission you choose." footer={
        <>
          <Button variant="ghost" onClick={() => setShareId(null)}>Done</Button>
          <Button onClick={doShare}><Link2 size={14} /> Copy link</Button>
        </>
      }>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-sub">Link permission</p>
          <Seg value={perm} onChange={setPerm} options={[{ value: "view", label: "Can view" }, { value: "edit", label: "Can edit" }]} />
        </div>
        <div className="mt-4 p-3 rounded-lg bg-surface2 border border-line text-[12px] font-mono text-sub break-all">
          {shareId ? `${location.origin}${location.pathname}#/shared/${shares.find((s) => s.designId === shareId)?.id || "…"}` : ""}
        </div>
        <p className="text-[11.5px] text-faint mt-3 leading-relaxed">Links resolve against this device's library. Real-time collaborative editing arrives with the Supabase backend — the share schema is already in place.</p>
      </Modal>

      <Modal open={!!confirmId} onClose={() => setConfirmId(null)} title="Delete forever?" width="max-w-md" footer={
        <>
          <Button variant="ghost" onClick={() => setConfirmId(null)}>Keep it</Button>
          <Button variant="danger" onClick={() => { if (confirmId) { purge(confirmId); toast("Design permanently deleted.", "info"); } setConfirmId(null); }}><Trash2 size={14} /> Delete forever</Button>
        </>
      }>
        <p className="text-sm text-sub leading-relaxed">This removes the design and its version history permanently. There's no undo for this one.</p>
      </Modal>
      <span className="hidden"><Heart size={1} /></span>
    </div>
  );
}
