import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Group, Rect, Ellipse, Line, Path, Text as KText, Image as KImage, Transformer } from "react-konva";
import Konva from "konva";
import type { DesignDocument, DesignElement, GradientSpec } from "../types";
import { useAppStore, useAssetsStore, useEditorStore } from "../stores";

let pageHintShown = false;
import { clamp, loadImage, smartResizeDoc, uid } from "../lib/utils";
import { platformById } from "../lib/constants";

// ─── Image hook with load state ─────────────────────────────────────────────
function useLoadedImage(src?: string): { img: HTMLImageElement | null; failed: boolean } {
  const [state, setState] = useState<{ img: HTMLImageElement | null; failed: boolean }>({ img: null, failed: false });
  useEffect(() => {
    let live = true;
    if (!src) { setState({ img: null, failed: false }); return; }
    setState({ img: null, failed: false });
    loadImage(src)
      .then((i) => { if (live) setState({ img: i, failed: false }); })
      .catch(() => { if (live) setState({ img: null, failed: true }); });
    return () => { live = false; };
  }, [src]);
  return state;
}

function fillProps(fill: DesignElement["fill"], w: number, h: number): Record<string, unknown> {
  if (!fill || fill === "transparent") return { fillEnabled: false };
  if (typeof fill === "string") return { fill };
  const g = fill as GradientSpec;
  const stops = g.stops.flatMap((s) => [s.offset, s.color]) as unknown as number[];
  if (g.kind === "radial") {
    return {
      fillRadialGradientStartPoint: { x: w / 2, y: h / 2 }, fillRadialGradientStartRadius: 0,
      fillRadialGradientEndPoint: { x: w / 2, y: h / 2 }, fillRadialGradientEndRadius: Math.max(w, h) * 0.72,
      fillRadialGradientColorStops: stops,
    };
  }
  const rad = ((g.angle - 90) * Math.PI) / 180;
  const dx = (Math.cos(rad) * w) / 2, dy = (Math.sin(rad) * h) / 2;
  return {
    fillLinearGradientStartPoint: { x: w / 2 - dx, y: h / 2 - dy },
    fillLinearGradientEndPoint: { x: w / 2 + dx, y: h / 2 + dy },
    fillLinearGradientColorStops: stops,
  };
}

// Konva 10 layout: shadow/blend/filters live on Shape, clipFunc lives on
// Container — so image effects stay on the <Image> and rounded corners are
// clipped by a wrapping <Group>.
function roundedRectClip(ctx: CanvasRenderingContext2D, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(-w / 2 + r, -h / 2);
  ctx.arcTo(w / 2, -h / 2, w / 2, h / 2, r);
  ctx.arcTo(w / 2, h / 2, -w / 2, h / 2, r);
  ctx.arcTo(-w / 2, h / 2, -w / 2, -h / 2, r);
  ctx.arcTo(-w / 2, -h / 2, w / 2, -h / 2, r);
  ctx.closePath();
}
const cacheRefFor = (filters: unknown) => (node: Konva.Image | null) => {
  if (!node) return;
  if (filters && !node.isCached()) node.cache();
  if (!filters && node.isCached()) node.clearCache();
};

// ─── One element node (memoized — never re-renders during drags) ───────────
interface NodeProps {
  e: DesignElement; selected: boolean; interactive: boolean; editing: boolean;
  onSelect: (id: string, additive: boolean) => void;
  onDblClick: (id: string) => void;
  onCommit: (node: Konva.Node) => void;
  onSnap: (node: Konva.Node) => void;
}

const ElementNode = memo(function ElementNode({ e, selected, interactive, editing, onSelect, onDblClick, onCommit, onSnap }: NodeProps) {
  const { img, failed } = useLoadedImage(e.type === "image" ? e.src : undefined);
  const cx = e.width / 2, cy = e.height / 2;
  const common = {
    id: e.id, name: e.id,
    draggable: interactive && !e.locked,
    listening: interactive,
    opacity: editing ? 0 : e.opacity,
    rotation: e.rotation,
    dragDistance: 2,
    globalCompositeOperation: e.blend && e.blend !== "source-over" ? (e.blend as never) : undefined,
    shadowColor: e.shadow?.blur ? e.shadow.color : undefined,
    shadowBlur: e.shadow?.blur || undefined,
    shadowOffsetX: e.shadow?.blur ? e.shadow.offsetX : undefined,
    shadowOffsetY: e.shadow?.blur ? e.shadow.offsetY : undefined,
    shadowOpacity: e.shadow?.blur ? e.shadow.opacity : undefined,
    // Select on press (not on release) so the transformer + snapping are live immediately
    onMouseDown: (ev: Konva.KonvaEventObject<MouseEvent>) => { ev.cancelBubble = true; onSelect(e.id, ev.evt.shiftKey); },
    onTouchStart: (ev: Konva.KonvaEventObject<TouchEvent>) => { ev.cancelBubble = true; onSelect(e.id, false); },
    onClick: (ev: Konva.KonvaEventObject<MouseEvent>) => { ev.cancelBubble = true; onSelect(e.id, ev.evt.shiftKey); },
    onTap: (ev: Konva.KonvaEventObject<TouchEvent>) => { ev.cancelBubble = true; onSelect(e.id, false); },
    onDblClick: () => onDblClick(e.id),
    onDblTap: () => onDblClick(e.id),
    onDragMove: (ev: Konva.KonvaEventObject<DragEvent>) => { if (selected) onSnap(ev.target); },
    onDragEnd: (ev: Konva.KonvaEventObject<DragEvent>) => onCommit(ev.target),
    onTransformEnd: (ev: Konva.KonvaEventObject<Event>) => onCommit(ev.target),
  };

  if (e.type === "rect") {
    return <Rect x={e.x + cx} y={e.y + cy} offset={{ x: cx, y: cy }} width={e.width} height={e.height}
      cornerRadius={e.radius || 0} stroke={e.strokeWidth ? e.stroke : undefined} strokeWidth={e.strokeWidth || 0}
      dash={e.dash} {...fillProps(e.fill, e.width, e.height)} {...common} />;
  }
  if (e.type === "ellipse") {
    return <Ellipse x={e.x + cx} y={e.y + cy} radiusX={e.width / 2} radiusY={e.height / 2}
      stroke={e.strokeWidth ? e.stroke : undefined} strokeWidth={e.strokeWidth || 0} dash={e.dash}
      {...fillProps(e.fill, e.width, e.height)} {...common} />;
  }
  if (e.type === "line") {
    return <Line x={e.x} y={e.y} points={e.points || [0, 0, e.width, 0]} stroke={e.stroke || "#111"}
      strokeWidth={e.strokeWidth || 2} dash={e.dash} lineCap="round" hitStrokeWidth={16} {...common} />;
  }
  if (e.type === "path") {
    // Konva Path reports width()===0 for parsed data — scale from the stable
    // data-space bounding box instead, so re-renders never compound the scale.
    return <Path x={e.x} y={e.y} data={e.data || ""} perfectDrawEnabled={false}
      ref={(node: Konva.Path | null) => {
        if (!node) return;
        const r = node.getSelfRect();
        const dw = r.width || 1, dh = r.height || 1;
        node.offset({ x: r.x, y: r.y });
        node.scale({ x: e.width / dw, y: e.height / dh });
      }}
      {...fillProps(e.fill, e.width, e.height)} {...common} />;
  }
  if (e.type === "text") {
    return <KText x={e.x + cx} y={e.y + cy} offset={{ x: cx, y: cy }} text={e.text || ""}
      fontSize={e.fontSize || 24} fontFamily={`'${e.fontFamily || "Poppins"}', sans-serif`}
      fontStyle={e.fontStyle || "normal"} letterSpacing={e.letterSpacing || 0} lineHeight={e.lineHeight || 1.2}
      align={e.align || "left"} width={e.width} fill={e.color || "#111"}
      textDecoration={(e.textDecoration as never) || undefined} {...common} />;
  }
  if (e.type === "image") {
    // Source failed to load: show a selectable placeholder instead of an invisible hole
    if (failed && !img) {
      return (
        <Rect x={e.x + cx} y={e.y + cy} offset={{ x: cx, y: cy }} width={e.width} height={e.height}
          fill="#cfccc3" cornerRadius={e.radius || 0} stroke="#b3b0a6" strokeWidth={2} dash={[10, 8]}
          {...common} />
      );
    }
    const { shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY, shadowOpacity, globalCompositeOperation, ...nodeCommon } = common;
    const f = e.filters;
    const hasFx = !!f && (Math.abs(f.brightness) > 0.01 || Math.abs(f.contrast) > 0.01 || Math.abs(f.saturation) > 0.01 || f.blur > 0.1);
    const F = (Konva.Filters || {}) as Record<string, unknown>;
    const list = hasFx && f ? [
      ...(Math.abs(f.brightness) > 0.01 && typeof F.Brighten === "function" ? [F.Brighten] : []),
      ...(Math.abs(f.contrast) > 0.01 && typeof F.Contrast === "function" ? [F.Contrast] : []),
      ...(Math.abs(f.saturation) > 0.01 && typeof F.HSL === "function" ? [F.HSL] : []),
      ...(f.blur > 0.1 && typeof F.Blur === "function" ? [F.Blur] : []),
    ] : [];
    const filters = list.length ? (list as never) : undefined;
    const inner = {
      width: e.width, height: e.height, image: img || undefined,
      crop: e.crop ? { x: e.crop.sx, y: e.crop.sy, width: e.crop.sw, height: e.crop.sh } : undefined,
      filters,
      brightness: f?.brightness || 0, contrast: (f?.contrast || 0) * 100,
      saturation: f?.saturation || 0, blurRadius: f?.blur || 0,
      shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY, shadowOpacity, globalCompositeOperation,
    };
    const radius = e.radius && e.radius > 0 ? Math.min(e.radius, e.width / 2, e.height / 2) : 0;
    if (radius > 0) {
      return (
        <Group x={e.x + cx} y={e.y + cy} clipFunc={((ctx: CanvasRenderingContext2D) => roundedRectClip(ctx, e.width, e.height, radius)) as never} {...nodeCommon}>
          <KImage offset={{ x: cx, y: cy }} ref={cacheRefFor(filters)} {...inner} />
        </Group>
      );
    }
    return <KImage x={e.x + cx} y={e.y + cy} offset={{ x: cx, y: cy }} ref={cacheRefFor(filters)} {...inner} {...nodeCommon} />;
  }
  return null;
}, (a, b) =>
  a.e === b.e && a.selected === b.selected && a.interactive === b.interactive && a.editing === b.editing &&
  a.onSelect === b.onSelect && a.onDblClick === b.onDblClick && a.onCommit === b.onCommit && a.onSnap === b.onSnap
);

// ─── Main canvas ────────────────────────────────────────────────────────────
export default function CanvasStage() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const guidesLayerRef = useRef<Konva.Layer>(null);
  const guideVRefs = useRef<(Konva.Line | null)[]>([]);
  const guideHRefs = useRef<(Konva.Line | null)[]>([]);
  const panRef = useRef({ dragging: false });

  const doc = useEditorStore((s) => s.doc);
  const selection = useEditorStore((s) => s.selection);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const tool = useEditorStore((s) => s.tool);
  const showGrid = useEditorStore((s) => s.showGrid);
  const showSafeZones = useEditorStore((s) => s.showSafeZones);
  const editingTextId = useEditorStore((s) => s.editingTextId);
  const select = useEditorStore((s) => s.select);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const updateElements = useEditorStore((s) => s.updateElements);
  const setEditingText = useEditorStore((s) => s.setEditingText);
  const addElements = useEditorStore((s) => s.addElements);
  const setDoc = useEditorStore((s) => s.setDoc);
  const pageSelected = useEditorStore((s) => s.pageSelected);
  const selectPage = useEditorStore((s) => s.selectPage);
  const uploads = useAssetsStore((s) => s.uploads);

  const [size, setSize] = useState({ w: 800, h: 600 });
  const [pos, setPos] = useState({ x: 60, y: 60 });
  const [space, setSpace] = useState(false);
  const [editVal, setEditVal] = useState("");

  const bgImgState = useLoadedImage(doc?.background.type === "image" ? doc?.background.src : undefined);
  const bgImg = bgImgState.img;

  // Live mirrors so drag-time callbacks never go stale and never cause re-renders
  const docRef = useRef(doc); docRef.current = doc;
  const selectionRef = useRef(selection); selectionRef.current = selection;

  const fit = useMemo(() => {
    if (!doc) return 0.3;
    return Math.min((size.w - 110) / doc.width, (size.h - 110) / doc.height);
  }, [doc, size]);
  const scale = fit * zoom;
  const scaleRef = useRef(scale); scaleRef.current = scale;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Re-center when the document size changes
  const docKey = doc ? `${doc.width}x${doc.height}` : "";
  useEffect(() => {
    if (!doc) return;
    const f = Math.min((size.w - 110) / doc.width, (size.h - 110) / doc.height);
    setPos({ x: (size.w - doc.width * f) / 2, y: (size.h - doc.height * f) / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey, size.w === 0]);

  // Space-to-pan
  useEffect(() => {
    const dn = (e: KeyboardEvent) => { if (e.code === "Space" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); setSpace(true); } };
    const up = (e: KeyboardEvent) => { if (e.code === "Space") setSpace(false); };
    window.addEventListener("keydown", dn); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  // Transformer attach (nodes resolved by Konva id)
  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;
    const nodes = selection.map((id) => stage.findOne(`#${id}`)).filter(Boolean) as Konva.Node[];
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selection, doc]);

  const zoomAt = useCallback((factor: number, px?: number, py?: number) => {
    const s1 = fit * zoom;
    const z2 = clamp(zoom * factor, 0.08, 5);
    const s2 = fit * z2;
    const mx = px ?? size.w / 2, my = py ?? size.h / 2;
    const wx = (mx - pos.x) / s1, wy = (my - pos.y) / s1;
    setPos({ x: mx - wx * s2, y: my - wy * s2 });
    setZoom(z2);
  }, [fit, zoom, pos, size, setZoom]);

  const fitView = useCallback(() => {
    setZoom(1);
    if (doc) setPos({ x: (size.w - doc.width * fit) / 2, y: (size.h - doc.height * fit) / 2 });
  }, [doc, size, fit, setZoom]);

  // ── Snap guides: drawn imperatively — ZERO React re-renders while dragging ──
  const drawGuides = useCallback((gv: number[], gh: number[]) => {
    const d = docRef.current, s = scaleRef.current;
    if (!d) return;
    guideVRefs.current.forEach((ln, i) => {
      if (!ln) return;
      ln.strokeWidth(1.5 / s); ln.dash([6 / s, 4 / s]);
      if (gv[i] !== undefined) { ln.points([gv[i], -4000, gv[i], d.height + 4000]); ln.visible(true); }
      else ln.visible(false);
    });
    guideHRefs.current.forEach((ln, i) => {
      if (!ln) return;
      ln.strokeWidth(1.5 / s); ln.dash([6 / s, 4 / s]);
      if (gh[i] !== undefined) { ln.points([-4000, gh[i], d.width + 4000, gh[i]]); ln.visible(true); }
      else ln.visible(false);
    });
    guidesLayerRef.current?.batchDraw();
  }, []);

  const onSnap = useCallback((node: Konva.Node) => {
    const d = docRef.current, sel = selectionRef.current;
    if (sel.length !== 1 || !d) return;
    const el = d.elements.find((x) => x.id === sel[0]);
    if (!el) return;
    const box = node.getClientRect({ relativeTo: node.getLayer() as never, skipTransform: false });
    const candV: number[] = [0, d.width / 2, d.width];
    const candH: number[] = [0, d.height / 2, d.height];
    d.elements.forEach((o) => {
      if (o.id === el.id || !o.visible) return;
      candV.push(o.x, o.x + o.width / 2, o.x + o.width);
      candH.push(o.y, o.y + o.height / 2, o.y + o.height);
    });
    const thresh = 6 / scaleRef.current;
    const gv: number[] = [], gh: number[] = [];
    let dx = 0, dy = 0;
    const myV = [box.x, box.x + box.width / 2, box.x + box.width];
    const myH = [box.y, box.y + box.height / 2, box.y + box.height];
    for (const c of candV) for (const m of myV) if (Math.abs(c - m) < thresh) { dx = c - m; gv.push(c); }
    for (const c of candH) for (const m of myH) if (Math.abs(c - m) < thresh) { dy = c - m; gh.push(c); }
    if (dx) node.x(node.x() + dx);
    if (dy) node.y(node.y() + dy);
    drawGuides([...new Set(gv)].slice(0, 3), [...new Set(gh)].slice(0, 3));
  }, [drawGuides]);

  // ── Commit drag/transform → document (single source of truth) ──
  const commitNode = useCallback((node: Konva.Node) => {
    const d = docRef.current;
    if (!d) return;
    const id = (node as unknown as { name?: () => string }).name?.();
    const el = d.elements.find((x) => x.id === id);
    if (!el) return;
    drawGuides([], []);
    const sel = selectionRef.current;

    // Multi-drag: apply the same delta to every selected element
    if (sel.length > 1 && sel.includes(el.id)) {
      const centered = el.type !== "line" && el.type !== "path";
      const ox = el.x + (centered ? el.width / 2 : 0);
      const oy = el.y + (centered ? el.height / 2 : 0);
      const dx = Math.round(node.x() - ox), dy = Math.round(node.y() - oy);
      if (dx || dy) updateElements(sel, (p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
      node.x(ox + (node.x() - ox)); // keep Konva node in sync (already there)
      return;
    }

    const sx = node.scaleX(), sy = node.scaleY();
    node.scale({ x: 1, y: 1 });
    const patch: Partial<DesignElement> = { rotation: Math.round(node.rotation()) };
    if (el.type === "line") {
      const pts = (node as Konva.Line).points().map((p, i) => Math.round(p * (i % 2 ? sy : sx)));
      (node as Konva.Line).points(pts);
      patch.points = pts;
      patch.x = Math.round(node.x()); patch.y = Math.round(node.y());
      patch.width = Math.max(4, Math.abs(pts[2] - pts[0])); patch.height = Math.max(2, Math.abs(pts[3] - pts[1]));
    } else if (el.type === "path") {
      const p = node as Konva.Path;
      const r = p.getSelfRect();
      patch.width = Math.max(2, Math.round((r.width || 1) * p.scaleX() * sx));
      patch.height = Math.max(2, Math.round((r.height || 1) * p.scaleY() * sy));
      p.scale({ x: 1, y: 1 }); // ref will re-derive a clean scale from the new size
      patch.x = Math.round(node.x()); patch.y = Math.round(node.y());
    } else if (el.type === "text") {
      patch.width = Math.round(node.width() * sx);
      patch.fontSize = Math.max(6, Math.round((el.fontSize || 24) * sy));
      patch.x = Math.round(node.x() - patch.width / 2);
      patch.y = Math.round(node.y() - node.height() / 2);
      patch.height = Math.round(node.height());
    } else {
      patch.width = Math.round(node.width() * sx);
      patch.height = Math.round(node.height() * sy);
      patch.x = Math.round(node.x() - patch.width / 2);
      patch.y = Math.round(node.y() - patch.height / 2);
    }
    updateElements([el.id], (prev) => ({ ...prev, ...patch }));
  }, [drawGuides, updateElements]);

  const onSelect = useCallback((id: string, additive: boolean) => select([id], additive), [select]);
  const onDblClick = useCallback((id: string) => {
    const d = docRef.current;
    const el = d?.elements.find((x) => x.id === id);
    if (el?.type === "text") { setEditingText(id); setEditVal(el.text || ""); }
  }, [setEditingText]);

  // ── Page-level gestures (Canva-style: select the frame, move/resize everything) ──
  const pageStartRef = useRef<{ doc: DesignDocument } | null>(null);
  const pageRafRef = useRef<number | null>(null);

  const pageDragStart = useCallback(() => {
    const d = docRef.current;
    if (d) pageStartRef.current = { doc: d };
  }, []);
  const pageDragMove = useCallback((dx: number, dy: number) => {
    const start = pageStartRef.current;
    if (!start) return;
    if (pageRafRef.current) cancelAnimationFrame(pageRafRef.current);
    pageRafRef.current = requestAnimationFrame(() => {
      const d = start.doc;
      setDoc({ ...d, elements: d.elements.map((el) => ({ ...el, x: Math.round(el.x + dx), y: Math.round(el.y + dy) })) }, false);
    });
  }, [setDoc]);
  const pageDragEnd = useCallback((node: Konva.Node) => {
    const dx = Math.round(node.x()), dy = Math.round(node.y());
    node.position({ x: 0, y: 0 });
    const start = pageStartRef.current;
    pageStartRef.current = null;
    if (pageRafRef.current) cancelAnimationFrame(pageRafRef.current);
    if (!start || (!dx && !dy)) return;
    const d = start.doc;
    setDoc({ ...d, elements: d.elements.map((el) => ({ ...el, x: el.x + dx, y: el.y + dy })) });
  }, [setDoc]);

  const startPageResize = useCallback((e: Konva.KonvaEventObject<PointerEvent>) => {
    e.cancelBubble = true;
    const d = docRef.current, stage = stageRef.current;
    if (!d || !stage) return;
    const startDoc = d;
    const center = { x: d.width / 2, y: d.height / 2 };
    const p0 = stage.getRelativePointerPosition();
    if (!p0) return;
    const d0 = Math.max(24, Math.hypot(p0.x - center.x, p0.y - center.y));
    let raf = 0, lastS = 1;
    const move = (ev: PointerEvent) => {
      const rect = stage.container().getBoundingClientRect();
      const px = (ev.clientX - rect.left - stage.x()) / stage.scaleX();
      const py = (ev.clientY - rect.top - stage.y()) / stage.scaleY();
      lastS = clamp(Math.hypot(px - center.x, py - center.y) / d0, 0.2, 4);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setDoc(smartResizeDoc(startDoc, Math.round(startDoc.width * lastS), Math.round(startDoc.height * lastS)), false);
      });
    };
    const up = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDoc(smartResizeDoc(startDoc, Math.round(startDoc.width * lastS), Math.round(startDoc.height * lastS)));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }, [setDoc]);

  // ── Drop uploads onto canvas ──
  const onDrop = useCallback((ev: React.DragEvent) => {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text/fs-asset");
    const src = ev.dataTransfer.getData("text/fs-src");
    if (!id && !src) return;
    const asset = uploads.find((u) => u.id === id);
    const imgSrc = asset?.src || src;
    const d = docRef.current;
    if (!imgSrc || !d) return;
    const rect = wrapRef.current!.getBoundingClientRect();
    const s = scaleRef.current;
    const stage = stageRef.current;
    const px = stage?.x() ?? 0, py = stage?.y() ?? 0;
    const wx = (ev.clientX - rect.left - px) / s;
    const wy = (ev.clientY - rect.top - py) / s;
    const iw = asset?.w || 800, ih = asset?.h || 800;
    const w = Math.min(d.width * 0.6, iw);
    const h = w * (ih / iw);
    addElements([{ id: uid("el"), type: "image", name: asset?.name || "Dropped image", x: Math.round(wx - w / 2), y: Math.round(wy - h / 2), width: Math.round(w), height: Math.round(h), rotation: 0, opacity: 1, visible: true, locked: false, src: imgSrc }]);
  }, [uploads, addElements]);

  if (!doc) return <div ref={wrapRef} className="flex-1 bg-editor" />;

  const canPan = space || tool === "pan";
  const editableEl = editingTextId ? doc.elements.find((e) => e.id === editingTextId) : null;
  const sz = platformById("instagram-story")?.safeZones;
  const docRatio = doc.width / doc.height;
  const safe = (docRatio < 0.8 && sz) ? sz : undefined;

  return (
    <div ref={wrapRef} className="flex-1 relative overflow-hidden bg-editor select-none" onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()} style={{ cursor: canPan ? "grab" : "default" }}>
      <Stage
        ref={stageRef}
        width={size.w} height={size.h}
        scaleX={scale} scaleY={scale}
        x={pos.x} y={pos.y}
        draggable={canPan}
        onDragStart={() => { panRef.current = { dragging: true }; }}
        onDragEnd={(e) => { setPos({ x: e.target.x(), y: e.target.y() }); }}
        onWheel={(e) => {
          e.evt.preventDefault();
          const p = stageRef.current?.getPointerPosition();
          zoomAt(e.evt.deltaY < 0 ? 1.12 : 0.89, p?.x, p?.y);
        }}
        onMouseDown={(e) => { if (e.target === e.target.getStage() && !canPan) { clearSelection(); setEditingText(null); } }}
        onTouchStart={(e) => { if (e.target === e.target.getStage() && !canPan) clearSelection(); }}
      >
        <Layer>
          {/* board shadow + background */}
          <Rect x={-14} y={-10} width={doc.width + 28} height={doc.height + 26} fill="#000" opacity={0.14} cornerRadius={6} listening={false} shadowColor="black" shadowBlur={30} shadowOpacity={0.25} />
          {doc.background.type === "solid" && <Rect width={doc.width} height={doc.height} fill={doc.background.color} listening={false} />}
          {doc.background.type === "gradient" && doc.background.gradient && (
            <Rect width={doc.width} height={doc.height} {...fillProps(doc.background.gradient, doc.width, doc.height)} listening={false} />
          )}
          {doc.background.type === "image" && bgImg && <KImage width={doc.width} height={doc.height} image={bgImg} listening={false} />}
          {doc.background.type === "transparent" && <Rect width={doc.width} height={doc.height} fill="#eceae3" listening={false} />}

          {/* Page click-catcher: click empty canvas → toggle whole-page selection.
              It is deliberately NOT draggable — the interior never moves the design;
              the whole banner moves only by grabbing the teal frame border (Canva-style),
              so element editing always stays stable. White @ 1%: hittable, never visible. */}
          <Rect width={doc.width} height={doc.height} fill="#fff" opacity={0.01}
            onClick={(ev) => {
              ev.cancelBubble = true;
              if (pageSelected) { clearSelection(); return; }
              selectPage();
              if (!pageHintShown) {
                pageHintShown = true;
                useAppStore.getState().toast("Whole page selected — drag the teal border to move everything, or click any element to edit it.", "info");
              }
            }}
            onTap={(ev) => { ev.cancelBubble = true; pageSelected ? clearSelection() : selectPage(); }}
          />

          {/* grid */}
          {showGrid && scale > 0.18 && Array.from({ length: Math.floor(doc.width / 100) - 1 }).map((_, i) => (
            <Line key={`gv${i}`} points={[(i + 1) * 100, 0, (i + 1) * 100, doc.height]} stroke="rgba(120,120,120,0.22)" strokeWidth={1 / scale} listening={false} />
          ))}
          {showGrid && scale > 0.18 && Array.from({ length: Math.floor(doc.height / 100) - 1 }).map((_, i) => (
            <Line key={`gh${i}`} points={[0, (i + 1) * 100, doc.width, (i + 1) * 100]} stroke="rgba(120,120,120,0.22)" strokeWidth={1 / scale} listening={false} />
          ))}

          {/* elements */}
          {doc.elements.filter((e) => e.visible).map((e) => (
            <ElementNode key={e.id} e={e}
              selected={selection.includes(e.id)}
              interactive={!e.locked}
              editing={editingTextId === e.id}
              onSelect={onSelect}
              onDblClick={onDblClick}
              onCommit={commitNode}
              onSnap={onSnap}
            />
          ))}

          {/* safe zones */}
          {showSafeZones && safe && (
            <>
              <Rect x={0} y={0} width={doc.width} height={doc.height * safe.top} fill="rgba(224,90,70,0.08)" stroke="rgba(224,90,70,0.5)" strokeWidth={1.5 / scale} dash={[8 / scale, 6 / scale]} listening={false} />
              <Rect x={0} y={doc.height * (1 - safe.bottom)} width={doc.width} height={doc.height * safe.bottom} fill="rgba(224,90,70,0.08)" stroke="rgba(224,90,70,0.5)" strokeWidth={1.5 / scale} dash={[8 / scale, 6 / scale]} listening={false} />
            </>
          )}

          <Transformer ref={trRef} rotateEnabled anchorSize={9} anchorCornerRadius={2}
            borderStroke="#0e7c6b" anchorStroke="#0e7c6b" anchorFill="#ffffff"
            rotateAnchorOffset={22} ignoreStroke keepRatio={false} padding={1} />
        </Layer>

        {/* snap guides + page chrome live on their own layer, updated imperatively */}
        <Layer ref={guidesLayerRef}>
          {[0, 1, 2].map((i) => (
            <Line key={`sgv${i}`} ref={(n: Konva.Line | null) => { guideVRefs.current[i] = n; }}
              points={[0, 0, 0, 0]} stroke="#0e7c6b" strokeWidth={1.5 / scale} dash={[6 / scale, 4 / scale]} visible={false} listening={false} />
          ))}
          {[0, 1, 2].map((i) => (
            <Line key={`sgh${i}`} ref={(n: Konva.Line | null) => { guideHRefs.current[i] = n; }}
              points={[0, 0, 0, 0]} stroke="#0e7c6b" strokeWidth={1.5 / scale} dash={[6 / scale, 4 / scale]} visible={false} listening={false} />
          ))}

          {/* Canva-style page frame: drag the border to move the entire banner,
              drag a corner to resize everything proportionally */}
          {pageSelected && (() => {
            const pad = 10 / scale;
            const hs = 13 / scale;
            const corners: [number, number][] = [[0, 0], [doc.width, 0], [0, doc.height], [doc.width, doc.height]];
            return (
              <>
                <Rect x={-pad - 4 / scale} y={-pad - 4 / scale} width={doc.width + (pad + 4 / scale) * 2} height={doc.height + (pad + 4 / scale) * 2}
                  stroke="#0e7c6b" strokeWidth={9 / scale} cornerRadius={10 / scale} opacity={0.16} listening={false} />
                <Rect x={-pad} y={-pad} width={doc.width + pad * 2} height={doc.height + pad * 2}
                  stroke="#0e7c6b" strokeWidth={2.5 / scale} cornerRadius={6 / scale}
                  hitStrokeWidth={20 / scale} draggable={!canPan}
                  onMouseEnter={() => { if (wrapRef.current) wrapRef.current.style.cursor = "grab"; }}
                  onMouseLeave={() => { if (wrapRef.current) wrapRef.current.style.cursor = ""; }}
                  onDragStart={pageDragStart}
                  onDragMove={(ev) => pageDragMove(ev.target.x(), ev.target.y())}
                  onDragEnd={(ev) => pageDragEnd(ev.target)}
                />
                {corners.map(([cxp, cyp], i) => (
                  <Rect key={`ph${i}`} x={cxp - hs / 2} y={cyp - hs / 2} width={hs} height={hs} cornerRadius={2.5 / scale}
                    fill="#0e7c6b" stroke="#ffffff" strokeWidth={1.6 / scale}
                    onMouseEnter={() => { if (wrapRef.current) wrapRef.current.style.cursor = i % 3 === 0 ? "nwse-resize" : "nesw-resize"; }}
                    onMouseLeave={() => { if (wrapRef.current) wrapRef.current.style.cursor = ""; }}
                    onPointerDown={startPageResize}
                  />
                ))}
              </>
            );
          })()}
        </Layer>
      </Stage>

      {/* In-place text editor overlay */}
      {editableEl && editableEl.type === "text" && (
        <textarea
          autoFocus value={editVal}
          onChange={(e) => setEditVal(e.target.value)}
          onBlur={() => { updateElements([editableEl.id], (p) => ({ ...p, text: editVal, height: Math.max(20, Math.round(editVal.split("\n").length * (editableEl.fontSize || 24) * (editableEl.lineHeight || 1.2))) })); setEditingText(null); }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) (e.target as HTMLTextAreaElement).blur();
          }}
          aria-label="Edit text"
          className="absolute z-30 bg-transparent outline-2 outline-accent outline rounded-sm resize-none overflow-hidden"
          style={{
            left: pos.x + editableEl.x * scale,
            top: pos.y + editableEl.y * scale,
            width: editableEl.width * scale,
            minHeight: Math.max(30, (editableEl.fontSize || 24) * scale * 1.4),
            fontSize: (editableEl.fontSize || 24) * scale,
            fontFamily: `'${editableEl.fontFamily}', sans-serif`,
            fontWeight: (editableEl.fontStyle || "").includes("bold") ? 700 : 400,
            fontStyle: (editableEl.fontStyle || "").includes("italic") ? "italic" : "normal",
            color: editableEl.color,
            textAlign: editableEl.align || "left",
            lineHeight: editableEl.lineHeight || 1.2,
            letterSpacing: (editableEl.letterSpacing || 0) * scale,
            padding: 0,
          }}
        />
      )}

      {/* Empty canvas hint */}
      {doc.elements.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center anim-fade-in">
            <p className="text-[13px] font-bold text-sub">Your canvas is empty</p>
            <p className="text-[12px] text-faint mt-1">Pick a template, drop in an upload, or add text from the left panel</p>
          </div>
        </div>
      )}

      {/* Zoom HUD */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-surface border border-line rounded-xl shadow-lg px-1.5 py-1">
        <button onClick={() => zoomAt(0.85)} className="w-7 h-7 rounded-lg text-sub hover:bg-surface2 font-bold cursor-pointer" aria-label="Zoom out">−</button>
        <button onClick={fitView} className="h-7 px-1.5 rounded-lg text-[11.5px] font-bold text-sub hover:bg-surface2 tabular-nums cursor-pointer" aria-label="Fit to screen">{Math.round(zoom * 100)}%</button>
        <button onClick={() => zoomAt(1.18)} className="w-7 h-7 rounded-lg text-sub hover:bg-surface2 font-bold cursor-pointer" aria-label="Zoom in">+</button>
      </div>

      {/* Status strip */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 text-[11px] font-bold text-sub bg-surface/90 border border-line rounded-full px-3 py-1.5 tabular-nums">
        <span>{doc.width} × {doc.height}</span>
        <span className="w-1 h-1 rounded-full bg-line2" />
        <span>{doc.elements.length} layer{doc.elements.length === 1 ? "" : "s"}</span>
        {selection.length > 0 && <><span className="w-1 h-1 rounded-full bg-line2" /><span className="text-accent">{selection.length} selected</span></>}
        {pageSelected && <><span className="w-1 h-1 rounded-full bg-line2" /><span className="text-accent">Page selected — drag frame to move, corners to resize</span></>}
      </div>

      {canPan && <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[11px] font-bold text-bg bg-ink/85 rounded-full px-3 py-1.5 pointer-events-none">Pan mode — drag to move the canvas</div>}
    </div>
  );
}
