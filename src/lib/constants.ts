import type { PlatformDef, GradientSpec } from "../types";

// ─── Platform presets ───────────────────────────────────────────────────────
export const PLATFORMS: PlatformDef[] = [
  { id: "instagram-post", label: "Instagram Post", group: "Instagram", width: 1080, height: 1080, hint: "Square feed post" },
  { id: "instagram-portrait", label: "Instagram Portrait", group: "Instagram", width: 1080, height: 1350, hint: "4:5 feed post" },
  { id: "instagram-story", label: "Instagram Story", group: "Instagram", width: 1080, height: 1920, hint: "Full-screen story", safeZones: { top: 0.13, bottom: 0.19 } },
  { id: "reel-cover", label: "Reel Cover", group: "Instagram", width: 1080, height: 1920, hint: "Reels cover frame", safeZones: { top: 0.13, bottom: 0.19 } },
  { id: "youtube-thumbnail", label: "YouTube Thumbnail", group: "YouTube", width: 1280, height: 720, hint: "16:9 video thumbnail" },
  { id: "facebook-post", label: "Facebook Post", group: "Facebook", width: 1200, height: 630, hint: "Link / feed post" },
  { id: "linkedin-post", label: "LinkedIn Post", group: "LinkedIn", width: 1200, height: 627, hint: "Professional feed" },
  { id: "pinterest-pin", label: "Pinterest Pin", group: "Pinterest", width: 1000, height: 1500, hint: "2:3 vertical pin" },
  { id: "whatsapp-status", label: "WhatsApp Status", group: "WhatsApp", width: 1080, height: 1920, hint: "Status update", safeZones: { top: 0.11, bottom: 0.15 } },
];

export const platformById = (id: string) => PLATFORMS.find((p) => p.id === id);

export const QUICK_SIZES = [
  "instagram-post", "instagram-story", "reel-cover", "youtube-thumbnail",
  "facebook-post", "linkedin-post",
] as const;

// ─── Fonts ──────────────────────────────────────────────────────────────────
export interface FontDef { id: string; family: string; category: string; weights: number[]; }
export const FONTS: FontDef[] = [
  { id: "poppins", family: "Poppins", category: "Geometric", weights: [400, 500, 600, 700, 800] },
  { id: "montserrat", family: "Montserrat", category: "Geometric", weights: [600, 700, 800] },
  { id: "inter", family: "Inter", category: "Grotesque", weights: [400, 600, 700] },
  { id: "oswald", family: "Oswald", category: "Condensed", weights: [500, 600, 700] },
  { id: "bebas", family: "Bebas Neue", category: "Display", weights: [400] },
  { id: "playfair", family: "Playfair Display", category: "Serif", weights: [400, 600, 700] },
  { id: "lora", family: "Lora", category: "Serif", weights: [400, 600] },
  { id: "spacegrotesk", family: "Space Grotesk", category: "Display", weights: [500, 600, 700] },
];
export const fontByFamily = (f: string) => FONTS.find((x) => x.family === f);

// ─── Palettes ───────────────────────────────────────────────────────────────
export interface Palette { name: string; bg: string; ink: string; accent: string; soft: string; muted: string; }
export const PALETTES: Palette[] = [
  { name: "Noir Luxe", bg: "#141517", ink: "#f2efe8", accent: "#c9a25e", soft: "#242528", muted: "#8f8d84" },
  { name: "Ivory Editorial", bg: "#f4f1ea", ink: "#1e1f22", accent: "#b4552d", soft: "#e7e1d4", muted: "#83807a" },
  { name: "Deep Viridian", bg: "#0c2b26", ink: "#eef4ee", accent: "#63c7a9", soft: "#143d36", muted: "#7fa396" },
  { name: "Paper Minimal", bg: "#fbfaf7", ink: "#191a1c", accent: "#0e7c6b", soft: "#ecebe3", muted: "#98968e" },
  { name: "Sunset Market", bg: "#fff4e6", ink: "#33221a", accent: "#e2622b", soft: "#ffe3c4", muted: "#a08367" },
  { name: "Royal Plum", bg: "#221a2e", ink: "#f3eefb", accent: "#b991e8", soft: "#322747", muted: "#9186a8" },
  { name: "Ocean Sale", bg: "#0b2e4f", ink: "#eef6ff", accent: "#59b7ff", soft: "#133f69", muted: "#7ea3c4" },
  { name: "Blush Studio", bg: "#f7e8e4", ink: "#3a2320", accent: "#c2543f", soft: "#efcfc6", muted: "#a97f72" },
  { name: "Citrus Pop", bg: "#f5f032", ink: "#181a05", accent: "#181a05", soft: "#e3dd1f", muted: "#7d7a20" },
  { name: "Slate Corporate", bg: "#f2f5f8", ink: "#16202b", accent: "#2563a8", soft: "#dce6f0", muted: "#77879a" },
  { name: "Forest Organic", bg: "#eef0e6", ink: "#20261c", accent: "#4a7c3f", soft: "#d9dfc8", muted: "#85906f" },
  { name: "Wine & Gold", bg: "#33121c", ink: "#f8ece9", accent: "#d9a441", soft: "#4a1d2b", muted: "#a67884" },
  { name: "Mono Bold", bg: "#111111", ink: "#f5f5f2", accent: "#f5f5f2", soft: "#2a2a2a", muted: "#8b8b88" },
  { name: "Coral Fresh", bg: "#fdf0ee", ink: "#2b1d1a", accent: "#ef6351", soft: "#f9d8d2", muted: "#b28c84" },
];

// ─── Stock photography (session images) ────────────────────────────────────
export interface StockImage { id: string; src: string; label: string; tags: string[]; }
export const STOCK_IMAGES: StockImage[] = [
  { id: "jewel", src: "https://image.qwenlm.ai/generated-images/132b85e3-b176-4eea-96ff-310d4dbd3760/_result.png", label: "Gold jewellery", tags: ["jewellery", "luxury", "gold", "sale"] },
  { id: "burger", src: "https://image.qwenlm.ai/generated-images/edcdfa2f-3bd0-4f69-8b37-17c9b53ae0e2/_result.png", label: "Gourmet burger", tags: ["restaurant", "food", "burger"] },
  { id: "bistro", src: "https://image.qwenlm.ai/generated-images/653b8bb4-2723-4a46-9496-322632f83833/_result.png", label: "Restaurant interior", tags: ["restaurant", "interior", "dining"] },
  { id: "fashion", src: "https://image.qwenlm.ai/generated-images/833f260f-01b5-4db5-bda4-4d9095200c91/_result.png", label: "Fashion editorial", tags: ["fashion", "style", "clothing"] },
  { id: "house", src: "https://image.qwenlm.ai/generated-images/7d4b5a11-7a53-499f-928c-f3ce610217ed/_result.png", label: "Modern home", tags: ["real estate", "property", "home"] },
  { id: "fitness", src: "https://image.qwenlm.ai/generated-images/ba4ccfe5-810b-4074-ae0e-144e013eda5a/_result.png", label: "Gym training", tags: ["fitness", "gym", "workout"] },
  { id: "travel", src: "https://image.qwenlm.ai/generated-images/69b9dc01-54ba-411f-9a7a-30820a029233/_result.png", label: "Tropical cliffs", tags: ["travel", "beach", "holiday"] },
  { id: "tech", src: "https://image.qwenlm.ai/generated-images/9deb99c4-b80e-4b84-9a48-7561f9b53707/_result.png", label: "Headphones", tags: ["technology", "electronics", "audio"] },
  { id: "festival", src: "https://image.qwenlm.ai/generated-images/9a6d397a-7070-4cd5-8bf0-661b11347e1c/_result.png", label: "Festival lights", tags: ["festival", "diwali", "celebration"] },
  { id: "beauty", src: "https://image.qwenlm.ai/generated-images/4cc674eb-7d71-46a1-8c59-953fd2f5b1ac/_result.png", label: "Skincare serum", tags: ["beauty", "skincare", "cosmetics"] },
];

// ─── Gradients / backgrounds ───────────────────────────────────────────────
export const GRADIENT_PRESETS: { name: string; spec: GradientSpec }[] = [
  { name: "Dusk", spec: { kind: "linear", angle: 135, stops: [{ color: "#1a2a4a", offset: 0 }, { color: "#3d2b56", offset: 1 }] } },
  { name: "Ember", spec: { kind: "linear", angle: 120, stops: [{ color: "#3a120c", offset: 0 }, { color: "#b4471f", offset: 1 }] } },
  { name: "Lagoon", spec: { kind: "linear", angle: 160, stops: [{ color: "#062e2b", offset: 0 }, { color: "#1a7a68", offset: 1 }] } },
  { name: "Champagne", spec: { kind: "linear", angle: 90, stops: [{ color: "#f6e7c8", offset: 0 }, { color: "#d9b380", offset: 1 }] } },
  { name: "Orchid", spec: { kind: "radial", angle: 0, stops: [{ color: "#41304f", offset: 0 }, { color: "#1c1524", offset: 1 }] } },
  { name: "Meadow", spec: { kind: "linear", angle: 45, stops: [{ color: "#eef0e0", offset: 0 }, { color: "#b9c9a2", offset: 1 }] } },
  { name: "Signal", spec: { kind: "linear", angle: 90, stops: [{ color: "#f5f032", offset: 0 }, { color: "#f0b429", offset: 1 }] } },
  { name: "Slate", spec: { kind: "linear", angle: 180, stops: [{ color: "#232a33", offset: 0 }, { color: "#0e1216", offset: 1 }] } },
];

export const SOLID_SWATCHES = [
  "#ffffff", "#f4f1ea", "#111111", "#141517", "#0c2b26", "#0b2e4f", "#33121c",
  "#221a2e", "#f5f032", "#f7e8e4", "#eef0e6", "#fff4e6", "#0e7c6b", "#b4552d",
  "#c2543f", "#2563a8", "#4a7c3f", "#d9a441", "#ef6351", "#f2f5f8",
];

// ─── Categories ─────────────────────────────────────────────────────────────
export const CATEGORIES = [
  { id: "Business", hue: "#2563a8" },
  { id: "Fashion", hue: "#b991e8" },
  { id: "Food", hue: "#e2622b" },
  { id: "Technology", hue: "#59b7ff" },
  { id: "Real Estate", hue: "#4a7c3f" },
  { id: "Education", hue: "#c9a25e" },
  { id: "Fitness", hue: "#c2543f" },
  { id: "Travel", hue: "#1a7a68" },
  { id: "Festival", hue: "#d9a441" },
  { id: "Sale", hue: "#ef6351" },
  { id: "Personal Branding", hue: "#0e7c6b" },
  { id: "Quotes", hue: "#83807a" },
  { id: "Events", hue: "#b4552d" },
];

export const INDUSTRIES = [
  "Jewellery", "Fashion", "Restaurant", "Electronics", "Real Estate", "Education",
  "Fitness", "Travel", "Healthcare", "Technology", "Automotive", "Beauty", "Finance",
];

// ─── Text presets ───────────────────────────────────────────────────────────
export const TEXT_PRESETS = [
  { id: "heading", label: "Heading", fontSize: 84, weight: 800, family: "Montserrat", sample: "Add a heading" },
  { id: "subheading", label: "Subheading", fontSize: 48, weight: 600, family: "Poppins", sample: "Add a subheading" },
  { id: "body", label: "Body text", fontSize: 30, weight: 400, family: "Inter", sample: "Add body text. Keep it short and scannable." },
  { id: "caption", label: "Caption", fontSize: 22, weight: 500, family: "Inter", sample: "SMALL CAPTION" },
  { id: "quote", label: "Quote", fontSize: 44, weight: 400, family: "Playfair Display", sample: "“Design is intelligence made visible.”", italic: true },
  { id: "price", label: "Price", fontSize: 72, weight: 700, family: "Oswald", sample: "$49.00" },
  { id: "offer", label: "Offer", fontSize: 96, weight: 400, family: "Bebas Neue", sample: "50% OFF" },
  { id: "cta", label: "Call to action", fontSize: 32, weight: 700, family: "Poppins", sample: "SHOP NOW" },
];

export const CONTENT_TONES = ["Professional", "Luxury", "Friendly", "Minimal", "Bold", "Urgent"] as const;
