import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X, Check, AlertTriangle, Info } from "lucide-react";
import { cx } from "../lib/utils";
import { useAppStore } from "../stores";

// ─── Button ─────────────────────────────────────────────────────────────────
type BtnVariant = "primary" | "outline" | "ghost" | "danger" | "dark" | "gold";
export function Button({ variant = "primary", size = "md", className, children, ...rest }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "xs" | "sm" | "md" | "lg" }) {
  const v: Record<BtnVariant, string> = {
    primary: "bg-accent text-white hover:bg-accent-deep shadow-sm shadow-accent/30",
    outline: "border border-line2 bg-surface hover:bg-surface2 text-ink",
    ghost: "text-sub hover:bg-surface2 hover:text-ink",
    danger: "bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20",
    dark: "bg-ink text-bg hover:opacity-85",
    gold: "bg-gold text-white hover:opacity-90",
  };
  const s = { xs: "h-7 px-2.5 text-xs gap-1.5", sm: "h-8 px-3 text-[13px] gap-1.5", md: "h-9.5 px-4 text-sm gap-2", lg: "h-11 px-5 text-[15px] gap-2" }[size];
  return (
    <button
      className={cx("inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 active:scale-[.97] disabled:opacity-45 disabled:pointer-events-none whitespace-nowrap cursor-pointer", v[variant], s, className)}
      {...rest}>
      {children}
    </button>
  );
}

export function IconBtn({ label, active, className, children, size = "md", ...rest }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean; size?: "sm" | "md" }) {
  return (
    <button aria-label={label} title={label}
      className={cx("relative inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer",
        size === "sm" ? "w-7 h-7" : "w-9 h-9",
        active ? "bg-accent/12 text-accent" : "text-sub hover:text-ink hover:bg-surface2",
        className)}
      {...rest}>
      {children}
    </button>
  );
}

// ─── Inputs ─────────────────────────────────────────────────────────────────
export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input className={cx("w-full h-9 px-3 rounded-lg bg-surface border border-line text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none transition-colors", className)} {...rest} />
  );
}

export function SearchInput({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cx("relative", className)}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
      <input className="w-full h-9.5 pl-9 pr-3 rounded-xl bg-surface border border-line text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none transition-colors" {...rest} />
    </div>
  );
}

export function TextArea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx("w-full px-3 py-2 rounded-lg bg-surface border border-line text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none resize-none", className)} {...rest} />;
}

export function SelectBox({ value, onChange, options, className, ariaLabel }:
  { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string; ariaLabel?: string }) {
  return (
    <div className={cx("relative", className)}>
      <select aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 pl-3 pr-8 rounded-lg bg-surface border border-line text-sm text-ink appearance-none cursor-pointer focus:border-accent focus:outline-none">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
    </div>
  );
}

export function Field({ label, children, right }: { label: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">{label}</span>
        {right}
      </div>
      {children}
    </label>
  );
}

export function NumInput({ label, value, onChange, min, max, step = 1 }:
  { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  const [local, setLocal] = useState(String(Math.round(value)));
  useEffect(() => setLocal(String(Math.round(value))), [value]);
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint block mb-1">{label}</span>
      <input
        type="number" value={local} min={min} max={max} step={step}
        onChange={(e) => { setLocal(e.target.value); const v = parseFloat(e.target.value); if (!Number.isNaN(v)) onChange(v); }}
        onBlur={() => setLocal(String(Math.round(value)))}
        className="w-full h-8 px-2 rounded-md bg-surface2 border border-line text-[13px] text-ink focus:border-accent focus:outline-none"
      />
    </label>
  );
}

export function SliderRow({ label, value, min, max, step = 1, onChange, format }:
  { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">{label}</span>
        <span className="text-[11px] font-semibold text-sub tabular-nums">{format ? format(value) : value}</span>
      </div>
      <input type="range" aria-label={label} min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full" />
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button role="switch" aria-checked={checked} onClick={onChange}
      className="flex items-center justify-between w-full py-1 cursor-pointer group">
      <span className="text-[13px] text-sub group-hover:text-ink transition-colors">{label}</span>
      <span className={cx("w-8.5 h-5 rounded-full p-0.5 transition-colors", checked ? "bg-accent" : "bg-line2")}>
        <span className={cx("block w-4 h-4 rounded-full bg-white shadow transition-transform", checked && "translate-x-3.5")} />
      </span>
    </button>
  );
}

export function Seg<T extends string>({ options, value, onChange, size = "md" }:
  { options: { value: T; label: React.ReactNode; title?: string }[]; value: T; onChange: (v: T) => void; size?: "sm" | "md" }) {
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-surface2 border border-line w-fit">
      {options.map((o) => (
        <button key={o.value} title={o.title} onClick={() => onChange(o.value)}
          className={cx("rounded-md font-semibold transition-all cursor-pointer",
            size === "sm" ? "px-2 h-6.5 text-[11px]" : "px-2.5 h-7.5 text-xs",
            value === o.value ? "bg-surface text-ink shadow-sm" : "text-faint hover:text-sub")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "gold" | "accent" }) {
  const t = { neutral: "bg-surface2 text-sub", gold: "bg-gold-soft text-gold", accent: "bg-accent/12 text-accent" }[tone];
  return <span className={cx("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide", t)}>{children}</span>;
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="px-1.5 py-0.5 rounded border border-line2 bg-surface2 text-[10px] font-bold text-sub">{children}</kbd>;
}

// ─── Color input ────────────────────────────────────────────────────────────
export function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  const isHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-line shrink-0" style={{ background: isHex ? value : "#fff" }}>
        <input type="color" aria-label={label || "Pick color"} value={isHex ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
      </div>
      <input value={value} onChange={(e) => onChange(e.target.value)} aria-label={label || "Color value"}
        className="flex-1 h-9 px-2.5 rounded-lg bg-surface2 border border-line text-[13px] font-mono text-ink focus:border-accent focus:outline-none" />
    </div>
  );
}

// ─── Modal ──────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, subtitle, children, footer, width = "max-w-lg" }:
  { open: boolean; onClose: () => void; title: React.ReactNode; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/45 anim-fade-in" onClick={onClose} />
      <div className={cx("relative w-full bg-surface rounded-2xl border border-line shadow-2xl shadow-black/25 anim-pop max-h-[88vh] flex flex-col", width)}>
        <div className="flex items-start justify-between px-5 pt-4.5 pb-3 border-b border-line shrink-0">
          <div>
            <h2 className="font-display font-bold text-[17px] text-ink leading-tight">{title}</h2>
            {subtitle && <p className="text-[12.5px] text-sub mt-0.5">{subtitle}</p>}
          </div>
          <IconBtn label="Close" onClick={onClose} size="sm"><X size={16} /></IconBtn>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-line flex justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

// ─── Dropdown menu ──────────────────────────────────────────────────────────
export interface MenuItem { label: string; icon?: React.ReactNode; onClick: () => void; danger?: boolean; }
export function Menu({ trigger, items, align = "right" }: { trigger: React.ReactNode; items: MenuItem[]; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((o) => !o)} className="cursor-pointer">{trigger}</div>
      {open && (
        <div className={cx("absolute z-[70] mt-1.5 min-w-44 py-1.5 rounded-xl bg-surface border border-line shadow-xl shadow-black/12 anim-pop", align === "right" ? "right-0" : "left-0")}>
          {items.map((it, i) => (
            <button key={i} onClick={() => { setOpen(false); it.onClick(); }}
              className={cx("w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium transition-colors cursor-pointer",
                it.danger ? "text-danger hover:bg-danger/10" : "text-ink hover:bg-surface2")}>
              {it.icon && <span className="text-sub">{it.icon}</span>}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 anim-fade-up">
      <div className="w-14 h-14 rounded-2xl bg-surface2 border border-line flex items-center justify-center text-sub mb-4">{icon}</div>
      <h3 className="font-display font-bold text-lg text-ink">{title}</h3>
      <p className="text-sm text-sub mt-1 max-w-sm leading-relaxed">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ─── Toasts ─────────────────────────────────────────────────────────────────
export function Toasts() {
  const toasts = useAppStore((s) => s.toasts);
  const dismiss = useAppStore((s) => s.dismissToast);
  return createPortal(
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="anim-toast pointer-events-auto flex items-center gap-2.5 pl-3.5 pr-2 py-2.5 rounded-xl bg-ink text-bg text-[13px] font-medium shadow-xl shadow-black/25 border border-white/10">
          {t.kind === "success" && <Check size={15} className="text-emerald-400 shrink-0" />}
          {t.kind === "error" && <AlertTriangle size={15} className="text-red-400 shrink-0" />}
          {t.kind === "info" && <Info size={15} className="text-sky-300 shrink-0" />}
          <span>{t.msg}</span>
          <button onClick={() => dismiss(t.id)} className="p-1 rounded-md hover:bg-white/10 cursor-pointer" aria-label="Dismiss"><X size={13} /></button>
        </div>
      ))}
    </div>,
    document.body
  );
}
