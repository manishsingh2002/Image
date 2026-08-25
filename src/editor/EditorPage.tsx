import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CloudOff, Cloudy, Download, Eye, Grid3x3, History as HistoryIcon, Redo2, Scan, Share2, Shield, Sparkles, Undo2 } from "lucide-react";
import CanvasStage from "./CanvasStage";
import LeftPanel from "./LeftPanel";
import RightPanel from "./RightPanel";
import { AIPanel, ExportModal, HistoryModal, PreviewModal, ResizeModal, ShareModal } from "./EditorModals";
import { Button, IconBtn, Toasts } from "../components/ui";
import { Logo } from "../components/shell";
import { useAppStore, useDesignsStore, useEditorStore } from "../stores";
import { cx, smartResizeDoc } from "../lib/utils";

export default function EditorPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useAppStore((s) => s.toast);
  const design = useDesignsStore((s) => s.designs.find((d) => d.id === id));
  const updateDocInStore = useDesignsStore((s) => s.updateDoc);
  const patch = useDesignsStore((s) => s.patch);

  const st = useEditorStore();
  const doc = st.doc;
  const [name, setName] = useState(design?.name || "");
  const [modal, setModal] = useState<null | "export" | "preview" | "history" | "share" | "ai" | "resize">(null);
  const [mobileNote, setMobileNote] = useState(() => window.innerWidth < 900);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedFor = useRef<string | null>(null);

  // Load design into editor store
  useEffect(() => {
    if (!id) return;
    const d = useDesignsStore.getState().designs.find((x) => x.id === id);
    if (!d) {
      toast("That design doesn't exist on this device.", "error");
      nav("/dashboard");
      return;
    }
    if (loadedFor.current !== id) {
      useEditorStore.getState().load(d);
      loadedFor.current = id;
      setName(d.name);
    }
  }, [id, nav, toast]);

  // Autosave (debounced) + status
  useEffect(() => {
    if (!doc || !id || loadedFor.current !== id) return;
    st.setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateDocInStore(id, doc);
      st.setSaveState("saved");
    }, 900);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, id]);

  // Flush + unload on leave
  useEffect(() => () => {
    const s = useEditorStore.getState();
    if (s.designId && s.doc) useDesignsStore.getState().updateDoc(s.designId, s.doc);
    s.unload();
    loadedFor.current = null;
  }, []);

  // Keyboard shortcuts
  const onKey = useCallback((e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t.isContentEditable) return;
    const s = useEditorStore.getState();
    if (!s.doc) return;
    const mod = e.metaKey || e.ctrlKey;

    if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? s.redo() : s.undo(); return; }
    if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); s.redo(); return; }
    if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); s.duplicateSelection(); return; }
    if (mod && e.key.toLowerCase() === "c") { s.copy(); return; }
    if (mod && e.key.toLowerCase() === "v") { s.paste(); return; }
    if ((e.key === "Delete" || e.key === "Backspace") && s.selection.length) { e.preventDefault(); s.removeElements(s.selection); return; }
    if (e.key === "Escape") { s.clearSelection(); s.setEditingText(null); return; }
    if (e.key.startsWith("Arrow") && s.selection.length) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
      const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
      s.updateElements(s.selection, (el) => ({ ...el, x: el.x + dx, y: el.y + dy }));
    }
  }, []);
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  // Redraw once webfonts arrive so canvas text uses them
  useEffect(() => {
    (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready.then(() => {
      useEditorStore.getState().setDoc(useEditorStore.getState().doc!, false);
    }).catch(() => {});
  }, []);

  if (!design || !doc) {
    return <div className="min-h-screen bg-editor flex items-center justify-center text-sub text-sm">Loading editor…</div>;
  }

  const saveLabel = st.saveState === "saving" ? "Saving…" : "Saved";

  return (
    <div className="h-screen flex flex-col bg-editor overflow-hidden">
      {/* Top bar */}
      <header className="h-13 shrink-0 border-b border-line bg-surface flex items-center gap-2 px-3">
        <button onClick={() => nav("/dashboard")} className="flex items-center gap-2 pr-2 cursor-pointer" aria-label="Back to dashboard">
          <Logo compact />
          <ArrowLeft size={16} className="text-sub hover:text-ink" />
        </button>
        <div className="min-w-0">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => { if (name.trim() && name !== design.name) { patch(design.id, { name: name.trim() }); toast("Design renamed.", "success"); } else setName(design.name); }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            aria-label="Design name"
            className="w-44 sm:w-64 px-2 py-1 -mx-2 rounded-lg text-[13.5px] font-bold text-ink hover:bg-surface2 focus:bg-surface2 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors truncate"
          />
          <p className={cx("px-2 -mx-2 text-[10px] font-bold flex items-center gap-1", st.saveState === "saving" ? "text-gold" : "text-accent")}>
            {st.saveState === "saving" ? <Cloudy size={10} /> : <CloudOff size={10} className="hidden" />}
            {saveLabel} · {doc.width}×{doc.height}
          </p>
        </div>

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-0.5">
          <IconBtn label="Undo (Ctrl+Z)" onClick={st.undo} className={cx(!st.past.length && "opacity-35 pointer-events-none")}><Undo2 size={16} /></IconBtn>
          <IconBtn label="Redo (Ctrl+Shift+Z)" onClick={st.redo} className={cx(!st.future.length && "opacity-35 pointer-events-none")}><Redo2 size={16} /></IconBtn>
        </div>
        <span className="hidden md:block w-px h-6 bg-line mx-1" />
        <IconBtn label="Toggle grid" active={st.showGrid} onClick={st.toggleGrid} className="hidden sm:inline-flex"><Grid3x3 size={16} /></IconBtn>
        <IconBtn label="Toggle safe zones" active={st.showSafeZones} onClick={st.toggleSafeZones} className="hidden sm:inline-flex"><Shield size={16} /></IconBtn>
        <IconBtn label="Resize design" onClick={() => setModal("resize")} className="hidden lg:inline-flex"><Scan size={16} /></IconBtn>
        <span className="hidden lg:block w-px h-6 bg-line mx-1" />

        <IconBtn label="Version history" onClick={() => setModal("history")}><HistoryIcon size={16} /></IconBtn>
        <IconBtn label="AI assistant" onClick={() => setModal("ai")}><Sparkles size={16} /></IconBtn>
        <Button size="sm" variant="outline" onClick={() => setModal("preview")} className="hidden sm:inline-flex"><Eye size={14} /> Preview</Button>
        <Button size="sm" variant="outline" onClick={() => setModal("share")} className="hidden sm:inline-flex"><Share2 size={14} /> Share</Button>
        <Button size="sm" onClick={() => setModal("export")}><Download size={14} /> Export</Button>
      </header>

      {/* Workspace */}
      <div className="flex-1 flex min-h-0">
        <LeftPanel />
        <CanvasStage />
        <RightPanel />
      </div>

      {/* Mobile note */}
      {mobileNote && (
        <div className="fixed bottom-4 inset-x-4 z-50 bg-ink text-bg rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 anim-toast">
          <p className="text-[12.5px] font-medium flex-1">The full editor is tuned for desktop. Everything still works here — panels scroll horizontally.</p>
          <button onClick={() => setMobileNote(false)} className="text-[12px] font-bold underline shrink-0 cursor-pointer">Got it</button>
        </div>
      )}

      {modal === "export" && <ExportModal open onClose={() => setModal(null)} doc={doc} name={design.name} />}
      {modal === "preview" && <PreviewModal open onClose={() => setModal(null)} doc={doc} name={design.name} />}
      {modal === "history" && <HistoryModal open onClose={() => setModal(null)} designId={design.id} doc={doc} />}
      {modal === "share" && <ShareModal open onClose={() => setModal(null)} designId={design.id} />}
      {modal === "ai" && <AIPanel open onClose={() => setModal(null)} doc={doc} />}
      {modal === "resize" && (
        <ResizeModal open onClose={() => setModal(null)} doc={doc}
          onApply={(w, h) => { st.setDoc(smartResizeDoc(doc, w, h)); toast(`Resized to ${w} × ${h} — layout adapted.`, "success"); }} />
      )}
    </div>
  );
}
