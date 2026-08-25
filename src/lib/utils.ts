import type { DesignDocument, DesignElement } from "../types";

export const uid = (p = "id") => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

export function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...a: A) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ─── Image pipeline ─────────────────────────────────────────────────────────
const imgCache = new Map<string, HTMLImageElement>();
const urlCache = new Map<string, string>();

/** Resolve a (possibly remote) image URL into a same-origin-safe URL when CORS
 *  allows it, so canvas exports never taint. Falls back to the original URL. */
async function resolveCleanUrl(src: string): Promise<string> {
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;
  if (urlCache.has(src)) return urlCache.get(src)!;
  try {
    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) throw new Error("http");
    const blob = await res.blob();
    const obj = URL.createObjectURL(blob);
    urlCache.set(src, obj);
    return obj;
  } catch {
    urlCache.set(src, src);
    return src;
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise(async (resolve, reject) => {
    const clean = await resolveCleanUrl(src);
    if (imgCache.has(clean)) return resolve(imgCache.get(clean)!);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imgCache.set(clean, img); resolve(img); };
    img.onerror = () => {
      // Retry without crossOrigin (may taint canvas but still displays)
      const img2 = new Image();
      img2.onload = () => { imgCache.set(clean, img2); resolve(img2); };
      img2.onerror = () => reject(new Error("Image failed to load"));
      img2.src = clean;
    };
    img.src = clean;
  });
}

/** Read + compress an uploaded file to a storable dataURL. */
export function processUploadFile(file: File, maxDim = 1600): Promise<{ dataUrl: string; w: number; h: number }> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp|svg\+xml|gif)$/.test(file.type)) {
      reject(new Error("Unsupported file type. Use JPG, PNG, WebP or SVG."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.onload = () => {
      const src = String(reader.result);
      if (file.type === "image/svg+xml") {
        resolve({ dataUrl: src, w: 1024, h: 1024 });
        return;
      }
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ dataUrl: canvas.toDataURL("image/jpeg", 0.88), w, h });
      };
      img.onerror = () => reject(new Error("Unable to upload image. Please try another file."));
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

// ─── Crop math ──────────────────────────────────────────────────────────────
/** Cover-fit crop of a source rect into a target aspect, centered or offset. */
export function coverCrop(
  imgW: number, imgH: number, targetW: number, targetH: number,
  centerX = 0.5, centerY = 0.5, zoom = 1
) {
  const targetR = targetW / targetH;
  let sw: number, sh: number;
  if (imgW / imgH > targetR) { sh = imgH / zoom; sw = sh * targetR; }
  else { sw = imgW / zoom; sh = sw / targetR; }
  sw = Math.min(sw, imgW); sh = Math.min(sh, imgH);
  const sx = clamp((imgW - sw) * centerX, 0, imgW - sw);
  const sy = clamp((imgH - sh) * centerY, 0, imgH - sh);
  return { sx: Math.round(sx), sy: Math.round(sy), sw: Math.round(sw), sh: Math.round(sh) };
}

// ─── Smart document resize ─────────────────────────────────────────────────
/** Layout-adaptive resize: repositions and rescales elements proportionally,
 *  preserves text hierarchy (fonts scale by area ratio), clamps into bounds. */
export function smartResizeDoc(doc: DesignDocument, newW: number, newH: number): DesignDocument {
  const rx = newW / doc.width;
  const ry = newH / doc.height;
  const area = Math.sqrt(rx * ry);
  const elements = doc.elements.map((el) => {
    const n: DesignElement = { ...el };
    n.width = Math.round(el.width * (el.type === "text" ? area : rx));
    n.height = Math.round(el.height * (el.type === "text" ? area : ry));
    n.x = Math.round(el.x * rx);
    n.y = Math.round(el.y * ry);
    if (el.type === "text" && el.fontSize) n.fontSize = Math.max(12, Math.round(el.fontSize * area));
    // Keep element inside the new canvas with a small margin
    const mx = Math.round(newW * 0.01), my = Math.round(newH * 0.01);
    n.x = clamp(n.x, -n.width + mx * 4, newW - mx);
    n.y = clamp(n.y, -n.height + my * 4, newH - my);
    return n;
  });
  return { width: newW, height: newH, background: { ...doc.background }, elements };
}

// ─── Color helpers ──────────────────────────────────────────────────────────
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(v, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
export function isLight(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length < 6) return true;
  const n = parseInt(h, 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 150;
}

// ─── Naming ─────────────────────────────────────────────────────────────────
export function autoName(platformLabel: string, templateName?: string): string {
  if (templateName) return `${platformLabel} — ${templateName}`;
  return `${platformLabel} Design`;
}

// ─── Safe storage ───────────────────────────────────────────────────────────
export function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}
