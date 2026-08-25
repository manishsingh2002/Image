import { useId } from "react";
import type { DesignDocument, DesignElement, Fill } from "../types";

// Pure-SVG renderer for a DesignDocument. Used for template cards, project
// thumbnails and the template browser — the editor itself uses Konva.
// Gradient defs are resolved up-front (SVG <defs> must exist before use).

function wrapText(text: string, width: number, fontSize: number, bold: boolean): string[] {
  const charW = fontSize * (bold ? 0.58 : 0.52);
  const maxChars = Math.max(4, Math.floor(width / charW));
  const lines: string[] = [];
  for (const hard of text.split("\n")) {
    if (hard.length <= maxChars) { lines.push(hard); continue; }
    const words = hard.split(" ");
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > maxChars) { lines.push(cur.trim()); cur = w; }
      else cur = (cur + " " + w).trim();
    }
    if (cur) lines.push(cur);
  }
  return lines.length ? lines : [""];
}

export default function DocSVG({ doc, width, className, radius = 0 }: {
  doc: DesignDocument; width?: number | string; className?: string; radius?: number;
}) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const defs: React.ReactNode[] = [];

  const resolveFill = (fill: Fill | undefined, key: string): string | undefined => {
    if (!fill || fill === "transparent") return undefined;
    if (typeof fill === "string") return fill;
    if (fill.kind === "radial") {
      defs.push(
        <radialGradient key={key} id={key} cx="50%" cy="50%" r="75%">
          {fill.stops.map((s, i) => <stop key={i} offset={s.offset} stopColor={s.color} />)}
        </radialGradient>
      );
    } else {
      const a = ((fill.angle - 90) * Math.PI) / 180;
      const x2 = 50 + 50 * Math.cos(a), y2 = 50 + 50 * Math.sin(a);
      defs.push(
        <linearGradient key={key} id={key} x1={`${100 - x2}%`} y1={`${100 - y2}%`} x2={`${x2}%`} y2={`${y2}%`}>
          {fill.stops.map((s, i) => <stop key={i} offset={s.offset} stopColor={s.color} />)}
        </linearGradient>
      );
    }
    return `url(#${key})`;
  };

  // Resolve everything BEFORE building the tree so <defs> is complete.
  const bgFill = doc.background.type === "gradient" ? resolveFill(doc.background.gradient, `bg-${rawId}`) : undefined;
  const items = doc.elements.filter((e) => e.visible).map((e, i) => ({ e, fillStr: resolveFill(e.fill, `g-${rawId}-${i}`) }));

  const renderEl = ({ e, fillStr }: { e: DesignElement; fillStr?: string }) => {
    const cx = e.x + e.width / 2, cy = e.y + e.height / 2;
    const transform = e.rotation ? `rotate(${e.rotation} ${cx} ${cy})` : undefined;
    const style: React.CSSProperties | undefined = e.blend && e.blend !== "source-over" ? { mixBlendMode: e.blend as never } : undefined;

    if (e.type === "rect") {
      return (
        <rect x={e.x} y={e.y} width={e.width} height={e.height} rx={e.radius || 0}
          stroke={e.stroke} strokeWidth={e.strokeWidth} strokeDasharray={e.dash?.join(" ")}
          fill={fillStr || "none"} opacity={e.opacity} transform={transform} style={style} />
      );
    }
    if (e.type === "ellipse") {
      return <ellipse cx={cx} cy={cy} rx={e.width / 2} ry={e.height / 2} fill={fillStr || "none"} opacity={e.opacity} transform={transform} style={style}
        stroke={e.strokeWidth ? e.stroke : undefined} strokeWidth={e.strokeWidth} strokeDasharray={e.dash?.join(" ")} />;
    }
    if (e.type === "line") {
      const pts = e.points || [0, 0, e.width, 0];
      return (
        <path d={`M ${e.x + pts[0]} ${e.y + pts[1]} L ${e.x + pts[2]} ${e.y + pts[3]}`}
          stroke={e.stroke || "#000"} strokeWidth={e.strokeWidth || 2} strokeDasharray={e.dash?.join(" ")}
          fill="none" opacity={e.opacity} transform={transform} style={style} strokeLinecap="round" />
      );
    }
    if (e.type === "path") {
      // Path data is in absolute coords — measure its real bbox and fit into e.w/h
      const nums = (e.data || "").match(/-?\d+(\.\d+)?/g)?.map(Number) || [];
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i + 1 < nums.length; i += 2) {
        minX = Math.min(minX, nums[i]); maxX = Math.max(maxX, nums[i]);
        minY = Math.min(minY, nums[i + 1]); maxY = Math.max(maxY, nums[i + 1]);
      }
      if (!Number.isFinite(minX)) return null;
      const sx = e.width / (maxX - minX || 1), sy = e.height / (maxY - minY || 1);
      return (
        <path d={e.data} transform={`translate(${e.x - minX * sx} ${e.y - minY * sy}) scale(${sx} ${sy})`}
          fill={fillStr || "none"} opacity={e.opacity} style={style} transform-origin="0 0" />
      );
    }
    if (e.type === "text") {
      const bold = (e.fontStyle || "").includes("bold");
      const italic = (e.fontStyle || "").includes("italic");
      const lines = wrapText(e.text || "", e.width, e.fontSize || 24, bold);
      const lh = (e.fontSize || 24) * (e.lineHeight || 1.2);
      const anchor = e.align === "center" ? "middle" : e.align === "right" ? "end" : "start";
      const tx = e.align === "center" ? cx : e.align === "right" ? e.x + e.width : e.x;
      return (
        <text x={tx} y={e.y + (e.fontSize || 24) * 0.82} fontSize={e.fontSize} fontFamily={`'${e.fontFamily}', sans-serif`}
          fontWeight={bold ? 700 : 400} fontStyle={italic ? "italic" : "normal"} fill={e.color}
          letterSpacing={e.letterSpacing} textAnchor={anchor} textDecoration={e.textDecoration}
          opacity={e.opacity} transform={transform} style={style}>
          {lines.map((l, i) => <tspan key={i} x={tx} dy={i === 0 ? 0 : lh}>{l}</tspan>)}
        </text>
      );
    }
    if (e.type === "image" && e.src) {
      let ix = e.x, iy = e.y, iw = e.width, ih = e.height;
      if (e.crop && e.crop.iw && e.crop.ih) {
        const k = e.width / e.crop.sw;
        ix = e.x - e.crop.sx * k; iy = e.y - e.crop.sy * k;
        iw = e.crop.iw * k; ih = e.crop.ih * k;
      }
      const clipId = `${rawId}-c-${e.id}`;
      defs.push(
        <clipPath key={clipId} id={clipId}>
          <rect x={e.x} y={e.y} width={e.width} height={e.height} rx={e.radius || 0} />
        </clipPath>
      );
      return (
        <g clipPath={`url(#${clipId})`} opacity={e.opacity} transform={transform} style={style}>
          <image href={e.src} x={ix} y={iy} width={iw} height={ih} preserveAspectRatio="xMidYMid slice" />
        </g>
      );
    }
    return null;
  };

  return (
    <svg viewBox={`0 0 ${doc.width} ${doc.height}`} width={width} className={className}
      style={{ display: "block", borderRadius: radius }} role="img" aria-label="Design preview">
      <defs>{defs}</defs>
      {doc.background.type === "solid" && <rect width={doc.width} height={doc.height} fill={doc.background.color} />}
      {doc.background.type === "transparent" && <rect width={doc.width} height={doc.height} fill="#e8e7e1" />}
      {bgFill && <rect width={doc.width} height={doc.height} fill={bgFill} />}
      {doc.background.type === "image" && doc.background.src && (
        <image href={doc.background.src} width={doc.width} height={doc.height} preserveAspectRatio="xMidYMid slice" />
      )}
      {items.map((it) => <g key={it.e.id}>{renderEl(it)}</g>)}
    </svg>
  );
}
