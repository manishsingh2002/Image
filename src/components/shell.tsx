import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, Check, ChevronDown, HelpCircle, LayoutTemplate, LogOut, Menu as MenuIcon, Moon, Monitor, Palette, Plus, Search, Sun, User, X, Zap } from "lucide-react";
import { PLATFORMS } from "../lib/constants";
import { TEMPLATES } from "../lib/templateFactory";
import { useAppStore, useDesignsStore } from "../stores";
import { cx, timeAgo } from "../lib/utils";
import { Button, IconBtn, Modal, Field, Input } from "./ui";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5 group" aria-label="Format Studio home">
      <span className="w-8 h-8 rounded-[10px] bg-accent flex items-center justify-center shadow-sm shadow-accent/40 group-hover:scale-105 transition-transform">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 14V2h10v2.6H6.2v2.9h5.6v2.6H6.2V14H3Z" fill="#fff" /></svg>
      </span>
      {!compact && <span className="font-display font-bold text-[17px] tracking-tight text-ink">Format<span className="text-accent"> Studio</span></span>}
    </Link>
  );
}

export function ThemeToggle() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  return (
    <IconBtn label={`Theme: ${theme} (click to change)`} onClick={() => setTheme(next)}>
      <Icon size={16} />
    </IconBtn>
  );
}

// ─── Create design modal (platform + custom size) ──────────────────────────
export function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const createDesign = useDesignsStore((s) => s.createDesign);
  const [w, setW] = useState(1080);
  const [h, setH] = useState(1080);
  const [unit, setUnit] = useState<"px" | "in" | "cm">("px");
  const toPx = (v: number) => (unit === "px" ? v : unit === "in" ? Math.round(v * 96) : Math.round(v * 37.795));
  const fromPx = (v: number) => (unit === "px" ? v : unit === "in" ? +(v / 96).toFixed(2) : +(v / 37.795).toFixed(2));

  const create = (platform: (typeof PLATFORMS)[number]["id"], width?: number, height?: number) => {
    const id = createDesign({ platform, width, height });
    onClose();
    nav(`/editor/${id}`);
  };

  return (
    <Modal open={open} onClose={onClose} title="Create a design" subtitle="Pick a platform preset or set exact dimensions." width="max-w-2xl">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {PLATFORMS.map((p) => {
          const ratio = p.width / p.height;
          return (
            <button key={p.id} onClick={() => create(p.id)}
              className="group flex flex-col items-start gap-2.5 p-3.5 rounded-xl border border-line bg-surface2/50 hover:border-accent hover:bg-accent/5 transition-all text-left cursor-pointer">
              <span className={cx("border-2 border-faint group-hover:border-accent rounded-[3px] transition-colors", ratio >= 1.4 ? "w-10 h-6" : ratio <= 0.7 ? "w-5 h-8" : "w-7.5 h-7.5")} />
              <span>
                <span className="block text-[13px] font-bold text-ink leading-tight">{p.label}</span>
                <span className="block text-[11px] text-faint mt-0.5">{p.width} × {p.height} px</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-5 pt-4 border-t border-line">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint mb-2.5">Custom size</p>
        <div className="flex flex-wrap items-end gap-2.5">
          <Field label="Width"><Input type="number" min={1} value={fromPx(w)} onChange={(e) => setW(toPx(parseFloat(e.target.value) || 0))} className="w-28" /></Field>
          <Field label="Height"><Input type="number" min={1} value={fromPx(h)} onChange={(e) => setH(toPx(parseFloat(e.target.value) || 0))} className="w-28" /></Field>
          <Field label="Unit">
            <div className="flex gap-0.5 p-0.5 rounded-lg bg-surface2 border border-line">
              {(["px", "in", "cm"] as const).map((u) => (
                <button key={u} onClick={() => setUnit(u)} className={cx("px-2.5 h-8 rounded-md text-xs font-bold cursor-pointer", unit === u ? "bg-surface text-ink shadow-sm" : "text-faint")}>{u}</button>
              ))}
            </div>
          </Field>
          <Button className="mb-0.5" onClick={() => create("custom", Math.round(w), Math.round(h))} disabled={w < 8 || h < 8}>
            <Plus size={15} /> Create {Math.round(w)} × {Math.round(h)}
          </Button>
        </div>
        <p className="text-[11px] text-faint mt-2">96 DPI assumed for inch/cm conversion · exports render at exact pixel dimensions.</p>
      </div>
    </Modal>
  );
}

// ─── App header (dashboard / library pages) ────────────────────────────────
export function AppHeader({ active }: { active: string }) {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, logout, notifications, markAllRead, toast } = useAppStore();
  const designs = useDesignsStore((s) => s.designs);
  const createDesign = useDesignsStore((s) => s.createDesign);
  const [createOpen, setCreateOpen] = useState(false);
  const [q, setQ] = useState("");
  const [panel, setPanel] = useState<"none" | "notif" | "profile" | "help" | "search">("none");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setPanel("none"); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  useEffect(() => { if (loc.hash) setPanel("none"); }, [loc]);

  const myDesigns = designs.filter((d) => !d.trashed);
  const dq = q.trim().toLowerCase();
  const dMatches = dq ? myDesigns.filter((d) => d.name.toLowerCase().includes(dq)).slice(0, 4) : [];
  const tMatches = dq ? TEMPLATES.filter((t) => t.name.toLowerCase().includes(dq) || t.tags.some((tag) => tag.includes(dq))).slice(0, 4) : [];
  const unread = notifications.filter((n) => !n.read).length;

  const navItems = [
    { to: "/dashboard", label: "Home" }, { to: "/templates", label: "Templates" },
    { to: "/projects", label: "Projects" }, { to: "/brand-kit", label: "Brand Kit" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/85 backdrop-blur-md" ref={wrapRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center gap-3">
        <Logo />
        <nav className="hidden md:flex items-center gap-1 ml-6" aria-label="Main">
          {navItems.map((n) => (
            <Link key={n.to} to={n.to}
              className={cx("px-3 py-1.5 rounded-lg text-[13.5px] font-semibold transition-colors",
                active === n.to ? "bg-accent/10 text-accent" : "text-sub hover:text-ink hover:bg-surface2")}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative hidden sm:block w-56 lg:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPanel(e.target.value ? "search" : "none"); }}
            onFocus={() => q && setPanel("search")}
            placeholder="Search designs & templates"
            aria-label="Search designs and templates"
            className="w-full h-9 pl-8.5 pr-3 rounded-xl bg-bg border border-line text-[13px] focus:border-accent focus:outline-none"
          />
          {panel === "search" && dq && (
            <div className="absolute top-11 left-0 right-0 bg-surface border border-line rounded-xl shadow-xl shadow-black/10 p-2 anim-pop max-h-96 overflow-y-auto">
              {dMatches.length > 0 && <p className="px-2 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-faint">Your designs</p>}
              {dMatches.map((d) => (
                <button key={d.id} onClick={() => { setPanel("none"); setQ(""); nav(`/editor/${d.id}`); }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-surface2 text-left cursor-pointer">
                  <span className="text-[13px] font-semibold text-ink truncate">{d.name}</span>
                  <span className="text-[11px] text-faint shrink-0">{timeAgo(d.updatedAt)}</span>
                </button>
              ))}
              {tMatches.length > 0 && <p className="px-2 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-faint">Templates</p>}
              {tMatches.map((t) => (
                <button key={t.id} onClick={() => { const id = createDesign({ platform: t.platform, template: t }); setPanel("none"); setQ(""); nav(`/editor/${id}`); }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-surface2 text-left cursor-pointer">
                  <span className="text-[13px] font-semibold text-ink truncate">{t.name}</span>
                  <span className="text-[11px] text-accent font-bold shrink-0">Use →</span>
                </button>
              ))}
              {!dMatches.length && !tMatches.length && <p className="px-2.5 py-3 text-[13px] text-sub">No matches for “{q}”. Try “jewellery sale” or “restaurant”.</p>}
            </div>
          )}
        </div>

        <Button size="sm" onClick={() => setCreateOpen(true)} className="hidden sm:inline-flex"><Plus size={15} /> Create</Button>

        <IconBtn label="Notifications" onClick={() => setPanel(panel === "notif" ? "none" : "notif")} active={panel === "notif"}>
          <Bell size={17} />
          {unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-danger" style={{ animation: "pulseDot 2s infinite" }} />}
        </IconBtn>
        <IconBtn label="Help & shortcuts" onClick={() => setPanel(panel === "help" ? "none" : "help")} active={panel === "help"}><HelpCircle size={17} /></IconBtn>
        <ThemeToggle />

        <button onClick={() => setPanel(panel === "profile" ? "none" : "profile")}
          className="flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-lg hover:bg-surface2 transition-colors cursor-pointer" aria-label="Account menu">
          <span className="w-7 h-7 rounded-full bg-ink text-bg flex items-center justify-center text-[12px] font-bold">
            {user ? user.name[0].toUpperCase() : <User size={14} />}
          </span>
          <ChevronDown size={13} className="text-faint hidden sm:block" />
        </button>

        {panel === "notif" && (
          <div className="absolute right-4 top-14 w-80 bg-surface border border-line rounded-xl shadow-xl shadow-black/10 anim-pop overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <p className="text-sm font-bold text-ink">Notifications</p>
              <button onClick={markAllRead} className="text-[11px] font-bold text-accent hover:underline cursor-pointer">Mark all read</button>
            </div>
            {notifications.map((n) => (
              <div key={n.id} className={cx("px-4 py-3 border-b border-line last:border-0", !n.read && "bg-accent/4")}>
                <div className="flex items-start gap-2">
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />}
                  <div>
                    <p className="text-[13px] font-bold text-ink">{n.title}</p>
                    <p className="text-[12px] text-sub mt-0.5 leading-relaxed">{n.body}</p>
                    <p className="text-[10.5px] text-faint mt-1">{timeAgo(n.ts)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {panel === "help" && (
          <div className="absolute right-4 top-14 w-80 bg-surface border border-line rounded-xl shadow-xl shadow-black/10 anim-pop p-4">
            <p className="text-sm font-bold text-ink mb-2.5">Editor shortcuts</p>
            {[["Ctrl/⌘ Z", "Undo"], ["Ctrl/⌘ Shift Z", "Redo"], ["Ctrl/⌘ D", "Duplicate"], ["Ctrl/⌘ C / V", "Copy / paste"], ["Delete", "Remove element"], ["Arrows", "Nudge (Shift = ×10)"], ["Esc", "Deselect"], ["Double-click text", "Edit in place"]].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-1.5">
                <span className="text-[12.5px] text-sub">{v}</span>
                <kbd className="px-1.5 py-0.5 rounded border border-line2 bg-surface2 text-[10.5px] font-bold text-sub">{k}</kbd>
              </div>
            ))}
          </div>
        )}

        {panel === "profile" && (
          <div className="absolute right-4 top-14 w-64 bg-surface border border-line rounded-xl shadow-xl shadow-black/10 anim-pop py-1.5">
            {user ? (
              <>
                <div className="px-4 py-2.5 border-b border-line mb-1">
                  <p className="text-[13.5px] font-bold text-ink">{user.name}</p>
                  <p className="text-[11.5px] text-faint">{user.email}</p>
                </div>
                <ProfileLink icon={<Palette size={14} />} label="Brand Kit" onClick={() => { setPanel("none"); nav("/brand-kit"); }} />
                <ProfileLink icon={<LogOut size={14} />} label="Sign out" onClick={() => { setPanel("none"); logout(); }} />
              </>
            ) : (
              <>
                <div className="px-4 py-2.5">
                  <p className="text-[13px] font-semibold text-ink">You're designing as a guest</p>
                  <p className="text-[11.5px] text-sub mt-0.5">Work is saved locally in this browser.</p>
                </div>
                <div className="px-3 pb-2 flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => nav("/login")}>Sign in</Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => nav("/signup")}>Sign up</Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Mobile nav */}
      <div className="md:hidden border-t border-line px-4 py-2 flex items-center gap-1 overflow-x-auto">
        {navItems.map((n) => (
          <Link key={n.to} to={n.to} className={cx("px-3 py-1.5 rounded-lg text-[13px] font-semibold whitespace-nowrap", active === n.to ? "bg-accent/10 text-accent" : "text-sub")}>{n.label}</Link>
        ))}
        <button onClick={() => setCreateOpen(true)} className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-bold text-accent whitespace-nowrap cursor-pointer"><Plus size={14} /> New</button>
      </div>

      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </header>
  );
}

function ProfileLink({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium text-ink hover:bg-surface2 transition-colors cursor-pointer">
      <span className="text-sub">{icon}</span>{label}
    </button>
  );
}

export { MenuIcon, X, Check, Zap, LayoutTemplate };
