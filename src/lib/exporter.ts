import Konva from "konva";
import type { DesignDocument, DesignElement, Fill } from "../types";
import { loadImage, resolveCleanUrl } from "./utils";

export type ExportFormat = "png" | "jpeg" | "webp" | "pdf";
export interface ExportOptions {
  scale: number;               // 1..4
  format: ExportFormat;
  quality: number;             // 0.5..1 (jpg/webp)
  transparent: boolean;        // png/webp only
  onProgress?: (stage: string) => void;
}

function applyFill(node: Konva.Shape, fill: Fill | undefined, w: number, h: number) {
  if (!fill || fill === "transparent") { node.fill("transparent"); return; }
  if (typeof fill === "string") { node.fill(fill); return; }
  if (fill.kind === "radial") {
    node.fillRadialGradientStartPoint({ x: w / 2, y: h / 2 });
    node.fillRadialGradientStartRadius(0);
    node.fillRadialGradientEndPoint({ x: w / 2, y: h / 2 });
    node.fillRadialGradientEndRadius(Math.max(w, h) * 0.72);
    node.fillRadialGradientColorStops(fill.stops.flatMap((s) => [s.offset, s.color]) as unknown as number[]);
  } else {
    const rad = ((fill.angle - 90) * Math.PI) / 180;
    const dx = (Math.cos(rad) * w) / 2, dy = (Math.sin(rad) * h) / 2;
    node.fillLinearGradientStartPoint({ x: w / 2 - dx, y: h / 2 - dy });
    node.fillLinearGradientEndPoint({ x: w / 2 + dx, y: h / 2 + dy });
    node.fillLinearGradientColorStops(fill.stops.flatMap((s) => [s.offset, s.color]) as unknown as number[]);
  }
}

function applyCommon(node: Konva.Shape, e: DesignElement) {
  node.rotation(e.rotation);
  node.opacity(e.opacity);
  if (e.blend && e.blend !== "source-over") (node as unknown as { globalCompositeOperation(v: string): void }).globalCompositeOperation(e.blend);
  if (e.shadow && e.shadow.blur > 0) {
    const s = node as Konva.Shape & {
      shadowColor(v: string): void; shadowBlur(v: number): void;
      shadowOffset(v: { x: number; y: number }): void; shadowOpacity(v: number): void;
    };
    s.shadowColor(e.shadow.color);
    s.shadowBlur(e.shadow.blur);
    s.shadowOffset({ x: e.shadow.offsetX, y: e.shadow.offsetY });
    s.shadowOpacity(e.shadow.opacity);
  }
}

export async function renderDocument(doc: DesignDocument, opts: ExportOptions): Promise<string> {
  const { scale, format, quality, transparent, onProgress } = opts;
  onProgress?.("Preparing design…");
  await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;

  // Load every image referenced by the document.
  const srcs = Array.from(new Set([
    ...(doc.background.type === "image" && doc.background.src ? [doc.background.src] : []),
    ...doc.elements.filter((e) => e.type === "image" && e.src).map((e) => e.src!),
  ]));
  // Resolve CORS-clean copies (bounded) so exports don't taint; loadImage itself never blocks.
  const results = await Promise.allSettled(
    srcs.map(async (s) => loadImage(await resolveCleanUrl(s)))
  );
  const imgMap = new Map<string, HTMLImageElement>();
  srcs.forEach((s, i) => { if (results[i].status === "fulfilled") imgMap.set(s, (results[i] as PromiseFulfilledResult<HTMLImageElement>).value); });

  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-20000px;top:0;pointer-events:none;";
  document.body.appendChild(container);

  try {
    const stage = new Konva.Stage({ container, width: doc.width, height: doc.height });
    const layer = new Konva.Layer();
    stage.add(layer);

    // Background
    const forceWhite = format === "jpeg" || !transparent;
    if (doc.background.type === "solid") {
      layer.add(new Konva.Rect({ x: 0, y: 0, width: doc.width, height: doc.height, fill: doc.background.color }));
    } else if (doc.background.type === "gradient" && doc.background.gradient) {
      const r = new Konva.Rect({ x: 0, y: 0, width: doc.width, height: doc.height });
      applyFill(r, doc.background.gradient, doc.width, doc.height);
      layer.add(r);
    } else if (doc.background.type === "image" && doc.background.src && imgMap.has(doc.background.src)) {
      layer.add(new Konva.Image({ x: 0, y: 0, width: doc.width, height: doc.height, image: imgMap.get(doc.background.src) }));
    } else if (forceWhite) {
      layer.add(new Konva.Rect({ x: 0, y: 0, width: doc.width, height: doc.height, fill: "#ffffff" }));
    }

    onProgress?.("Rendering…");

    for (const e of doc.elements) {
      if (!e.visible) continue;
      let node: Konva.Node | null = null;
      const cx = e.width / 2, cy = e.height / 2;

      if (e.type === "rect") {
        const r = new Konva.Rect({ x: e.x + cx, y: e.y + cy, offset: { x: cx, y: cy }, width: e.width, height: e.height, cornerRadius: e.radius || 0 });
        applyFill(r, e.fill, e.width, e.height);
        if (e.stroke && e.strokeWidth) { r.stroke(e.stroke); r.strokeWidth(e.strokeWidth); if (e.dash) r.dash(e.dash); }
        node = r;
      } else if (e.type === "ellipse") {
        const c = new Konva.Ellipse({ x: e.x + cx, y: e.y + cy, radiusX: e.width / 2, radiusY: e.height / 2 });
        applyFill(c, e.fill, e.width, e.height);
        if (e.stroke && e.strokeWidth) {
          c.stroke(e.stroke); c.strokeWidth(e.strokeWidth);
          if (e.dash) c.dash(e.dash);
        }
        node = c;
      } else if (e.type === "line") {
        const pts = e.points || [0, 0, e.width, 0];
        node = new Konva.Line({ x: e.x, y: e.y, points: pts, stroke: e.stroke || "#111", strokeWidth: e.strokeWidth || 2, dash: e.dash, lineCap: "round" });
      } else if (e.type === "path") {
        const p = new Konva.Path({ x: e.x, y: e.y, data: e.data || "" });
        const dw = p.width() || 1, dh = p.height() || 1;
        p.scale({ x: e.width / dw, y: e.height / dh });
        applyFill(p, e.fill, e.width, e.height);
        node = p;
      } else if (e.type === "text") {
        node = new Konva.Text({
          x: e.x + cx, y: e.y + cy, offset: { x: cx, y: cy },
          text: e.text || "", fontSize: e.fontSize, fontFamily: `'${e.fontFamily}', sans-serif`,
          fontStyle: e.fontStyle || "normal", letterSpacing: e.letterSpacing || 0,
          lineHeight: e.lineHeight || 1.2, align: e.align || "left", width: e.width,
          fill: e.color || "#111", textDecoration: (e.textDecoration as never) || "",
        });
      } else if (e.type === "image") {
        const img = e.src ? imgMap.get(e.src) : undefined;
        if (img) {
          const crop = e.crop
            ? { x: e.crop.sx, y: e.crop.sy, width: e.crop.sw, height: e.crop.sh }
            : undefined;
          const n = new Konva.Image({ x: e.x + cx, y: e.y + cy, offset: { x: cx, y: cy }, width: e.width, height: e.height, image: img, crop });
          if (e.radius && e.radius > 0) {
            n.cornerRadius(e.radius);
            (n as unknown as { clipFunc(f: (ctx: CanvasRenderingContext2D) => void): void }).clipFunc((ctx: CanvasRenderingContext2D) => { roundRectPath(ctx, e.width, e.height, e.radius!); });
          }
          const f = e.filters;
          const hasFilters = f && (Math.abs(f.brightness) > 0.01 || Math.abs(f.contrast) > 0.01 || Math.abs(f.saturation) > 0.01 || f.blur > 0.1);
          if (hasFilters && f) {
            n.cache();
            const filters: never[] = [];
            if (Math.abs(f.brightness) > 0.01) { filters.push(Konva.Filters.Brighten as never); n.brightness(f.brightness); }
            if (Math.abs(f.contrast) > 0.01) { filters.push(Konva.Filters.Contrast as never); n.contrast(f.contrast * 100); }
            if (Math.abs(f.saturation) > 0.01) { filters.push(Konva.Filters.HSL as never); n.saturation(f.saturation); }
            if (f.blur > 0.1) { filters.push(Konva.Filters.Blur as never); n.blurRadius(f.blur); }
            n.filters(filters);
          }
          node = n;
        } else {
          // Image unavailable — render a labeled placeholder block instead of failing.
          node = new Konva.Rect({ x: e.x + cx, y: e.y + cy, offset: { x: cx, y: cy }, width: e.width, height: e.height, fill: "#d8d6cf", cornerRadius: e.radius || 0 });
        }
      }

      if (node) {
        applyCommon(node as Konva.Shape, e);
        layer.add(node as Konva.Shape);
      }
    }

    layer.draw();
    onProgress?.("Finalizing…");

    const mime = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
    const dataUrl = stage.toDataURL({ pixelRatio: scale, mimeType: mime, quality });
    stage.destroy();
    return dataUrl;
  } finally {
    container.remove();
  }
}

function roundRectPath(ctx: CanvasRenderingContext2D, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(-w / 2 + r, -h / 2);
  ctx.arcTo(w / 2, -h / 2, w / 2, h / 2, r);
  ctx.arcTo(w / 2, h / 2, -w / 2, h / 2, r);
  ctx.arcTo(-w / 2, h / 2, -w / 2, -h / 2, r);
  ctx.arcTo(-w / 2, -h / 2, w / 2, -h / 2, r);
  ctx.closePath();
}

// ─── Minimal PDF writer (JPEG-in-PDF, no dependencies) ─────────────────────
export function jpegDataUrlToPdf(dataUrl: string, imgW: number, imgH: number): Blob {
  const b64 = dataUrl.split(",")[1];
  const bin = atob(b64);
  const jpeg = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) jpeg[i] = bin.charCodeAt(i);

  const wPt = imgW * 0.75, hPt = imgH * 0.75;
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let pos = 0;
  const push = (s: string | Uint8Array) => {
    const b = typeof s === "string" ? enc.encode(s) : s;
    chunks.push(b); pos += b.length;
  };
  const obj = (n: number, body: string | Uint8Array, binaryWrap?: [string, string]) => {
    offsets[n] = pos;
    push(`${n} 0 obj\n`);
    if (binaryWrap) { push(binaryWrap[0]); push(body); push(binaryWrap[1]); }
    else push(body);
    push("\nendobj\n");
  };

  push("%PDF-1.4\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${wPt.toFixed(2)} ${hPt.toFixed(2)}] /Resources << /XObject << /Im1 5 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 4 0 R >>`);
  const content = `q ${wPt.toFixed(2)} 0 0 ${hPt.toFixed(2)} 0 0 cm /Im1 Do Q`;
  obj(4, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  const imgDict = `<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`;
  obj(5, jpeg, [imgDict, "\nendstream"]);

  const xrefPos = pos;
  push("xref\n0 6\n0000000000 65535 f \n");
  for (let i = 1; i <= 5; i++) push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`);

  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}
