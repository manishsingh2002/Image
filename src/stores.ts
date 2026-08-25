import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AISuggestion, Asset, BrandKitData, DesignDocument, DesignElement, DesignMeta, DesignTemplate, PlatformId, ShareLink, AppNotification, User, VersionSnap } from "./types";
import { blankDoc, generateSuggestion } from "./lib/templateFactory";
import { platformById } from "./lib/constants";
import { autoName, safeParse, uid } from "./lib/utils";

// ─── Storage abstraction ────────────────────────────────────────────────────
// Swappable persistence layer. In production this adapter is replaced by a
// Supabase client (see services note at the bottom); the rest of the app only
// talks to the stores, never to a specific backend.
const safeGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* quota */ } };
const safeDel = (k: string) => { try { localStorage.removeItem(k); } catch { /* noop */ } };

export const storageAdapter = { getItem: safeGet, setItem: safeSet, removeItem: safeDel };
const persistStorage = createJSONStorage(() => storageAdapter);

// ─── App store (theme, auth, toasts, notifications, shares) ────────────────
interface Toast { id: string; msg: string; kind: "success" | "error" | "info"; }
interface StoredUser { email: string; name: string; pass: string; }

interface AppState {
  theme: "light" | "dark" | "system";
  setTheme: (t: "light" | "dark" | "system") => void;
  user: User | null;
  login: (email: string, pass: string) => string | null;
  signup: (name: string, email: string, pass: string) => string | null;
  logout: () => void;
  toasts: Toast[];
  toast: (msg: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: string) => void;
  notifications: AppNotification[];
  markAllRead: () => void;
  shares: ShareLink[];
  addShare: (designId: string, permission: "view" | "edit") => ShareLink;
}

const getUsers = (): StoredUser[] => safeParse(safeGet("fs_users"), [] as StoredUser[]);
const putUsers = (u: StoredUser[]) => safeSet("fs_users", JSON.stringify(u));

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "system",
      setTheme: (t) => set({ theme: t }),
      user: null,
      login: (email, pass) => {
        const u = getUsers().find((x) => x.email.toLowerCase() === email.toLowerCase());
        if (!u) return "No account found with this email. Try creating one first.";
        if (u.pass !== btoa(pass)) return "Incorrect password. Please try again.";
        set({ user: { name: u.name, email: u.email } });
        get().toast(`Welcome back, ${u.name.split(" ")[0]}.`, "success");
        return null;
      },
      signup: (name, email, pass) => {
        const users = getUsers();
        if (users.some((x) => x.email.toLowerCase() === email.toLowerCase())) return "An account with this email already exists.";
        users.push({ name, email, pass: btoa(pass) });
        putUsers(users);
        set({ user: { name, email } });
        get().toast("Account created. You're in.", "success");
        return null;
      },
      logout: () => { set({ user: null }); get().toast("Signed out.", "info"); },
      toasts: [],
      toast: (msg, kind = "info") => {
        const id = uid("t");
        set((s) => ({ toasts: [...s.toasts.slice(-3), { id, msg, kind }] }));
        setTimeout(() => get().dismissToast(id), 3800);
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      notifications: [
        { id: "n1", title: "New festival templates", body: "10 fresh festival layouts just landed in the library.", ts: Date.now() - 3600e3, read: false },
        { id: "n2", title: "4K export is here", body: "Scale any design up to 4x on export.", ts: Date.now() - 86400e3, read: false },
      ],
      markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      shares: [],
      addShare: (designId, permission) => {
        const link: ShareLink = { id: uid("sh").slice(3), designId, permission, createdAt: Date.now() };
        set((s) => ({ shares: [...s.shares, link] }));
        return link;
      },
    }),
    { name: "fs-app", storage: persistStorage, partialize: ((s: AppState) => ({ theme: s.theme, user: s.user, notifications: s.notifications, shares: s.shares })) as (s: AppState) => AppState }
  )
);

// ─── Designs store ──────────────────────────────────────────────────────────
interface DesignsState {
  designs: DesignMeta[];
  createDesign: (opts: { platform: PlatformId; width?: number; height?: number; template?: DesignTemplate }) => string;
  updateDoc: (id: string, doc: DesignDocument) => void;
  patch: (id: string, p: Partial<DesignMeta>) => void;
  duplicate: (id: string) => string | null;
  moveToTrash: (id: string) => void;
  restore: (id: string) => void;
  purge: (id: string) => void;
  toggleFavorite: (id: string) => void;
  getByShareId: (shareId: string) => DesignMeta | undefined;
}

export const useDesignsStore = create<DesignsState>()(
  persist(
    (set, get) => ({
      designs: [],
      createDesign: ({ platform, width, height, template }) => {
        const id = uid("dsg");
        const plat = platformById(platform);
        const w = width || template?.width || plat?.width || 1080;
        const h = height || template?.height || plat?.height || 1080;
        const doc: DesignDocument = template
          ? {
              width: w, height: h,
              background: { ...template.design.background },
              elements: template.design.elements.map((e) => ({ ...e, id: uid("el") })),
            }
          : blankDoc(w, h);
        const meta: DesignMeta = {
          id,
          name: template ? autoName(plat?.label || `${w} × ${h}`, template.name) : autoName(plat?.label || `${w} × ${h}`),
          platform, createdAt: Date.now(), updatedAt: Date.now(),
          favorite: false, trashed: false, templateName: template?.name, doc,
        };
        set((s) => ({ designs: [meta, ...s.designs] }));
        return id;
      },
      updateDoc: (id, doc) =>
        set((s) => ({ designs: s.designs.map((d) => (d.id === id ? { ...d, doc, updatedAt: Date.now() } : d)) })),
      patch: (id, p) =>
        set((s) => ({ designs: s.designs.map((d) => (d.id === id ? { ...d, ...p, updatedAt: Date.now() } : d)) })),
      duplicate: (id) => {
        const src = get().designs.find((d) => d.id === id);
        if (!src) return null;
        const nid = uid("dsg");
        const copy: DesignMeta = {
          ...src, id: nid, name: `${src.name} (copy)`, createdAt: Date.now(), updatedAt: Date.now(),
          doc: { ...src.doc, elements: src.doc.elements.map((e) => ({ ...e, id: uid("el") })) },
        };
        set((s) => ({ designs: [copy, ...s.designs] }));
        return nid;
      },
      moveToTrash: (id) => set((s) => ({ designs: s.designs.map((d) => (d.id === id ? { ...d, trashed: true } : d)) })),
      restore: (id) => set((s) => ({ designs: s.designs.map((d) => (d.id === id ? { ...d, trashed: false } : d)) })),
      purge: (id) => { set((s) => ({ designs: s.designs.filter((d) => d.id !== id) })); safeDel(`fs_versions_${id}`); },
      toggleFavorite: (id) => set((s) => ({ designs: s.designs.map((d) => (d.id === id ? { ...d, favorite: !d.favorite } : d)) })),
      getByShareId: (shareId) => {
        const share = useAppStore.getState().shares.find((s) => s.id === shareId);
        return share ? get().designs.find((d) => d.id === share.designId) : undefined;
      },
    }),
    { name: "fs-designs", storage: persistStorage }
  )
);

// ─── Brand kit store ────────────────────────────────────────────────────────
interface BrandState {
  kit: BrandKitData;
  setKit: (p: Partial<BrandKitData>) => void;
  setColor: (k: keyof BrandKitData["colors"], v: string) => void;
  setFont: (k: keyof BrandKitData["fonts"], v: string) => void;
  setLogo: (src: string | null) => void;
}
export const useBrandStore = create<BrandState>()(
  persist(
    (set) => ({
      kit: {
        name: "My Brand",
        colors: { primary: "#0e7c6b", secondary: "#1b1d21", accent: "#d9a441", background: "#f6f5f0" },
        fonts: { heading: "Montserrat", body: "Inter" },
        logo: null,
      },
      setKit: (p) => set((s) => ({ kit: { ...s.kit, ...p } })),
      setColor: (k, v) => set((s) => ({ kit: { ...s.kit, colors: { ...s.kit.colors, [k]: v } } })),
      setFont: (k, v) => set((s) => ({ kit: { ...s.kit, fonts: { ...s.kit.fonts, [k]: v } } })),
      setLogo: (src) => set((s) => ({ kit: { ...s.kit, logo: src } })),
    }),
    { name: "fs-brand", storage: persistStorage }
  )
);

// ─── Uploads store ──────────────────────────────────────────────────────────
interface AssetsState {
  uploads: Asset[];
  add: (a: Asset) => void;
  remove: (id: string) => void;
}
export const useAssetsStore = create<AssetsState>()(
  persist(
    (set) => ({
      uploads: [],
      add: (a) => set((s) => ({ uploads: [a, ...s.uploads].slice(0, 60) })),
      remove: (id) => set((s) => ({ uploads: s.uploads.filter((u) => u.id !== id) })),
    }),
    { name: "fs-assets", storage: persistStorage }
  )
);

// ─── Editor store ───────────────────────────────────────────────────────────
interface EditorState {
  designId: string | null;
  doc: DesignDocument | null;
  selection: string[];
  past: DesignDocument[];
  future: DesignDocument[];
  lastPush: number;
  zoom: number;
  tool: "select" | "pan";
  showGrid: boolean;
  showSafeZones: boolean;
  saveState: "idle" | "saving" | "saved";
  editingTextId: string | null;

  load: (meta: DesignMeta) => void;
  unload: () => void;
  setDoc: (doc: DesignDocument, history?: boolean) => void;
  updateElements: (ids: string[], fn: (e: DesignElement) => DesignElement, history?: boolean) => void;
  addElements: (els: DesignElement[]) => void;
  removeElements: (ids: string[]) => void;
  select: (ids: string[], additive?: boolean) => void;
  clearSelection: () => void;
  setEditingText: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  copy: () => DesignElement[];
  paste: () => void;
  duplicateSelection: () => void;
  setZoom: (z: number) => void;
  setTool: (t: "select" | "pan") => void;
  toggleGrid: () => void;
  toggleSafeZones: () => void;
  setSaveState: (s: "idle" | "saving" | "saved") => void;
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  designId: null, doc: null, selection: [], past: [], future: [], lastPush: 0,
  zoom: 1, tool: "select", showGrid: false, showSafeZones: true, saveState: "idle", editingTextId: null,

  load: (meta) => set({ designId: meta.id, doc: meta.doc, selection: [], past: [], future: [], zoom: 1, saveState: "idle", editingTextId: null }),
  unload: () => set({ designId: null, doc: null, selection: [], past: [], future: [], editingTextId: null }),

  setDoc: (doc, history = true) => {
    const s = get();
    if (!s.doc) { set({ doc }); return; }
    const now = Date.now();
    if (history) {
      const coalesce = now - s.lastPush < 600;
      set({
        past: coalesce ? s.past : [...s.past.slice(-59), s.doc],
        future: coalesce ? s.future : [],
        lastPush: now, doc,
      });
    } else set({ doc });
  },

  updateElements: (ids, fn, history = true) => {
    const s = get();
    if (!s.doc) return;
    const next = { ...s.doc, elements: s.doc.elements.map((e) => (ids.includes(e.id) ? fn({ ...e }) : e)) };
    get().setDoc(next, history);
  },

  addElements: (els) => {
    const s = get();
    if (!s.doc) return;
    get().setDoc({ ...s.doc, elements: [...s.doc.elements, ...els] });
    set({ selection: els.map((e) => e.id) });
  },

  removeElements: (ids) => {
    const s = get();
    if (!s.doc) return;
    get().setDoc({ ...s.doc, elements: s.doc.elements.filter((e) => !ids.includes(e.id)) });
    set({ selection: s.selection.filter((id) => !ids.includes(id)) });
  },

  select: (ids, additive = false) =>
    set((s) => ({ selection: additive ? Array.from(new Set([...s.selection, ...ids])) : ids })),
  clearSelection: () => set({ selection: [] }),
  setEditingText: (id) => set({ editingTextId: id }),

  undo: () => {
    const s = get();
    if (!s.past.length || !s.doc) return;
    const prev = s.past[s.past.length - 1];
    set({ past: s.past.slice(0, -1), future: [s.doc, ...s.future], doc: prev, selection: [] });
  },
  redo: () => {
    const s = get();
    if (!s.future.length || !s.doc) return;
    const next = s.future[0];
    set({ future: s.future.slice(1), past: [...s.past, s.doc], doc: next, selection: [] });
  },

  copy: () => {
    const s = get();
    const els = s.doc?.elements.filter((e) => s.selection.includes(e.id)) || [];
    set({ selection: s.selection });
    return els.map((e) => ({ ...e }));
  },
  paste: () => {
    const s = get();
    const els = clipboardCache;
    if (!s.doc || !els.length) return;
    const clones = els.map((e) => ({ ...e, id: uid("el"), x: e.x + 24, y: e.y + 24 }));
    get().addElements(clones);
  },
  duplicateSelection: () => {
    const els = get().copy();
    if (els.length) { const clones = els.map((e) => ({ ...e, id: uid("el"), x: e.x + 28, y: e.y + 28 })); get().addElements(clones); }
  },

  setZoom: (z) => set({ zoom: Math.min(4, Math.max(0.08, z)) }),
  setTool: (t) => set({ tool: t }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleSafeZones: () => set((s) => ({ showSafeZones: !s.showSafeZones })),
  setSaveState: (saveState) => set({ saveState }),
}));

let clipboardCache: DesignElement[] = [];
const origCopy = useEditorStore.getState().copy;
useEditorStore.setState({
  copy: () => { const els = origCopy(); clipboardCache = els; return els; },
});

// ─── Versions ───────────────────────────────────────────────────────────────
export const loadVersions = (designId: string): VersionSnap[] => safeParse(safeGet(`fs_versions_${designId}`), [] as VersionSnap[]);
export const saveVersions = (designId: string, versions: VersionSnap[]) => safeSet(`fs_versions_${designId}`, JSON.stringify(versions.slice(0, 20)));

// ─── Service interfaces (swap-in points for real backends) ─────────────────
// AI: LocalAIProvider ships with the app. To connect OpenAI/Anthropic/etc.,
// implement AIProvider with your API key in an env var — no UI changes needed.
export interface AIProvider { suggest(prompt: string): Promise<AISuggestion>; }
export const LocalAIProvider: AIProvider = {
  suggest: async (prompt) => generateSuggestion(prompt),
};
export const ai: AIProvider = LocalAIProvider;
