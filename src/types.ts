// ─── Format Studio domain model ─────────────────────────────────────────────
// Every design is a JSON document. Templates, exports, versions and shares all
// operate on this structure — nothing is hardcoded to the UI.

export type ElementType = "rect" | "ellipse" | "line" | "path" | "text" | "image";

export interface GradientStop { color: string; offset: number; }
export interface GradientSpec {
  kind: "linear" | "radial";
  angle: number; // degrees, linear only
  stops: GradientStop[];
}
export type Fill = string | GradientSpec;

export interface ShadowSpec {
  color: string; blur: number; offsetX: number; offsetY: number; opacity: number;
}

export interface ImageFilters {
  brightness: number; contrast: number; saturation: number; blur: number;
}

export interface DesignElement {
  id: string;
  type: ElementType;
  name: string;
  x: number; y: number;
  width: number; height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  // shape
  fill?: Fill;
  radius?: number;
  stroke?: string;
  strokeWidth?: number;
  dash?: number[];
  shadow?: ShadowSpec | null;
  blend?: string;
  // path
  data?: string;
  points?: number[]; // line
  // text
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string; // "normal" | "bold" | "italic" | "bold italic"
  letterSpacing?: number;
  lineHeight?: number;
  align?: "left" | "center" | "right";
  color?: string;
  textDecoration?: string;
  // image
  src?: string;
  crop?: { sx: number; sy: number; sw: number; sh: number; iw?: number; ih?: number } | null;
  filters?: ImageFilters;
}

export interface Background {
  type: "solid" | "gradient" | "image" | "transparent";
  color?: string;
  gradient?: GradientSpec;
  src?: string;
}

export interface DesignDocument {
  width: number;
  height: number;
  background: Background;
  elements: DesignElement[];
}

export interface DesignTemplate {
  id: string;
  name: string;
  category: string;
  industry: string;
  platform: PlatformId;
  width: number;
  height: number;
  premium: boolean;
  tags: string[];
  design: DesignDocument;
}

export interface DesignMeta {
  id: string;
  name: string;
  platform: PlatformId;
  createdAt: number;
  updatedAt: number;
  favorite: boolean;
  trashed: boolean;
  templateName?: string;
  doc: DesignDocument;
}

export interface BrandKitData {
  name: string;
  colors: { primary: string; secondary: string; accent: string; background: string };
  fonts: { heading: string; body: string };
  logo?: string | null;
}

export interface Asset {
  id: string;
  name: string;
  src: string; // dataURL (compressed)
  w: number; h: number;
  createdAt: number;
}

export interface VersionSnap {
  id: string; label: string; ts: number; doc: DesignDocument;
}

export interface ShareLink {
  id: string; designId: string; permission: "view" | "edit"; createdAt: number;
}

export interface AppNotification {
  id: string; title: string; body: string; ts: number; read: boolean;
}

export type PlatformId =
  | "instagram-post" | "instagram-portrait" | "instagram-story" | "reel-cover"
  | "youtube-thumbnail" | "facebook-post" | "linkedin-post" | "pinterest-pin"
  | "whatsapp-status" | "custom";

export interface PlatformDef {
  id: PlatformId;
  label: string;
  group: string;
  width: number;
  height: number;
  hint: string;
  safeZones?: { top: number; bottom: number }; // fractions of height
}

export interface User { name: string; email: string; }

export interface AISuggestion {
  headline: string;
  subheadline: string;
  offer?: string;
  cta: string;
  palette: { name: string; bg: string; ink: string; accent: string; soft: string; muted: string };
  layout: string;
  caption: string;
  hashtags: string[];
}
