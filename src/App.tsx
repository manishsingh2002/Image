import { lazy, Suspense, useEffect } from "react";
import { HashRouter, Route, Routes, useNavigate, useParams, Link } from "react-router-dom";
import { useAppStore, useDesignsStore } from "./stores";
import { Toasts, Button, ErrorBoundary } from "./components/ui";
import { Share2 } from "lucide-react";
import DocSVG from "./components/DocSVG";
import { fmtDate } from "./lib/utils";

// If a lazy chunk fails to load (stale cache after a redeploy), reload once.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazySafe<T extends React.ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() =>
    factory().catch(() => {
      try {
        if (!sessionStorage.getItem("fs-chunk-reload")) {
          sessionStorage.setItem("fs-chunk-reload", "1");
          window.location.reload();
          return new Promise<never>(() => {});
        }
      } catch { /* private mode */ }
      throw new Error("Unable to load this screen. Please refresh the page.");
    })
  );
}

const Landing = lazySafe(() => import("./pages/Landing"));
const Auth = lazySafe(() => import("./pages/Auth"));
const Dashboard = lazySafe(() => import("./pages/Dashboard"));
const TemplatesPage = lazySafe(() => import("./pages/TemplatesPage"));
const ProjectsPage = lazySafe(() => import("./pages/ProjectsPage"));
const BrandKitPage = lazySafe(() => import("./pages/BrandKitPage"));
const EditorPage = lazySafe(() => import("./editor/EditorPage"));

function ThemeSync() {
  const theme = useAppStore((s) => s.theme);
  useEffect(() => {
    try { sessionStorage.removeItem("fs-chunk-reload"); } catch { /* noop */ }
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
  return null;
}

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-3 anim-fade-in">
        <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
          <span className="font-display font-bold text-white text-lg">F</span>
        </div>
        <div className="w-28 h-1 rounded-full bg-surface2 overflow-hidden">
          <div className="h-full w-1/2 bg-accent rounded-full" style={{ animation: "shimmer 1.1s linear infinite", backgroundSize: "400px 100%" }} />
        </div>
      </div>
    </div>
  );
}

function SharedView() {
  const { shareId } = useParams();
  const nav = useNavigate();
  const design = useDesignsStore((s) => s.getByShareId(shareId || ""));
  const permission = useAppStore((s) => s.shares.find((x) => x.id === shareId)?.permission);
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 border-b border-line bg-surface">
        <div className="flex items-center gap-3">
          <Share2 size={16} className="text-accent" />
          <div>
            <p className="text-sm font-semibold text-ink">{design ? design.name : "Shared design"}</p>
            <p className="text-xs text-sub">Shared link · {permission === "edit" ? "can edit" : "view only"}{design ? ` · created ${fmtDate(design.createdAt)}` : ""}</p>
          </div>
        </div>
        <Button size="sm" onClick={() => nav("/dashboard")}>Open Format Studio</Button>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        {design ? (
          <div className="shadow-2xl shadow-black/20 rounded-lg overflow-hidden anim-pop" style={{ maxHeight: "76vh" }}>
            <DocSVG doc={design.doc} width={Math.min(560, (design.doc.width / design.doc.height) * 700)} />
          </div>
        ) : (
          <div className="text-center anim-fade-up">
            <h1 className="font-display font-bold text-xl text-ink">This link doesn't match a design on this device</h1>
            <p className="text-sm text-sub mt-2 max-w-sm">Share links resolve against the local project library. Open the link on the device where the design lives, or recreate the share.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <ThemeSync />
      <ErrorBoundary>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Auth mode="login" />} />
            <Route path="/signup" element={<Auth mode="signup" />} />
            <Route path="/forgot" element={<Auth mode="forgot" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/brand-kit" element={<BrandKitPage />} />
            <Route path="/shared/:shareId" element={<SharedView />} />
            <Route path="/editor/:id" element={<EditorPage />} />
            <Route path="*" element={<Landing />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <Toasts />
    </HashRouter>
  );
}

export { Link };
