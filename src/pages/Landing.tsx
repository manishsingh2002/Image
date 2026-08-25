import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, ChevronDown, Crop, Download, LayoutTemplate, Layers, MousePointer2, Palette, Sparkles, Type, Wand2 } from "lucide-react";
import DocSVG from "../components/DocSVG";
import { Logo, ThemeToggle } from "../components/shell";
import { Button } from "../components/ui";
import { PLATFORMS } from "../lib/constants";
import { TEMPLATES } from "../lib/templateFactory";
import { useAppStore } from "../stores";
import { cx } from "../lib/utils";

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add("is-in"); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={cx("reveal", className)} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

const heroPicks = [TEMPLATES[0], TEMPLATES[33], TEMPLATES[70]];
const gallery = [...TEMPLATES].sort((a, b) => Number(b.premium) - Number(a.premium)).slice(0, 14);

export default function Landing() {
  const nav = useNavigate();
  const toast = useAppStore((s) => s.toast);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-bg text-ink overflow-x-clip">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center gap-6">
          <Logo />
          <nav className="hidden md:flex items-center gap-5 ml-4 text-[13.5px] font-semibold text-sub" aria-label="Landing">
            <a href="#templates" className="hover:text-ink transition-colors">Templates</a>
            <a href="#editor" className="hover:text-ink transition-colors">Editor</a>
            <a href="#pricing" className="hover:text-ink transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-ink transition-colors">FAQ</a>
          </nav>
          <div className="flex-1" />
          <ThemeToggle />
          <Link to="/login" className="text-[13.5px] font-semibold text-sub hover:text-ink transition-colors hidden sm:block">Sign in</Link>
          <Button size="sm" onClick={() => nav("/dashboard")}>Start designing <ArrowRight size={14} /></Button>
        </div>
      </header>

      {/* Opening — the product, immediately */}
      <section className="relative max-w-6xl mx-auto px-5 pt-14 pb-20 lg:pt-20">
        <div className="absolute inset-0 dot-grid opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_20%,black,transparent)] pointer-events-none" />
        <div className="relative grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-accent anim-fade-up">
              <span className="w-6 h-px bg-accent" /> Social-first design studio
            </p>
            <h1 className="font-display font-bold tracking-[-0.03em] leading-[1.02] text-[42px] sm:text-[56px] lg:text-[64px] mt-5 anim-fade-up" style={{ animationDelay: "80ms" }}>
              Create social content that looks <em className="not-italic text-accent">professional.</em>
            </h1>
            <p className="text-[16.5px] leading-relaxed text-sub max-w-lg mt-6 anim-fade-up" style={{ animationDelay: "160ms" }}>
              Design high-quality posts, stories, advertisements and marketing creatives in minutes —
              upload an image, pick a template, let smart cropping do the rest, export in crisp high resolution.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-8 anim-fade-up" style={{ animationDelay: "240ms" }}>
              <Button size="lg" onClick={() => nav("/dashboard")}>Start designing <ArrowRight size={16} /></Button>
              <Button size="lg" variant="outline" onClick={() => nav("/templates")}>Explore templates</Button>
            </div>
            <dl className="flex flex-wrap gap-x-8 gap-y-3 mt-10 anim-fade-up" style={{ animationDelay: "320ms" }}>
              {[["90+", "editable templates"], ["9", "platform presets"], ["4×", "hi-res export"], ["100%", "yours — no watermark"]].map(([n, l]) => (
                <div key={l}>
                  <dt className="font-display font-bold text-[22px] text-ink leading-none">{n}</dt>
                  <dd className="text-[12px] text-faint mt-1 font-medium">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Live collage of real templates */}
          <div className="relative h-[430px] sm:h-[500px] hidden sm:block" aria-hidden>
            <div className="absolute left-[4%] top-[6%] w-[52%] anim-float shadow-2xl shadow-black/25 rounded-xl overflow-hidden ring-1 ring-black/10" style={{ "--rot": "-5deg", transform: "rotate(-5deg)", zIndex: 2 } as React.CSSProperties}>
              <DocSVG doc={heroPicks[0].design} width="100%" />
            </div>
            <div className="absolute right-[2%] top-[2%] w-[40%] anim-float shadow-xl shadow-black/20 rounded-xl overflow-hidden ring-1 ring-black/10" style={{ "--rot": "4deg", transform: "rotate(4deg)", animationDelay: "1.2s", zIndex: 1 } as React.CSSProperties}>
              <DocSVG doc={heroPicks[1].design} width="100%" />
            </div>
            <div className="absolute right-[12%] bottom-[2%] w-[46%] anim-float shadow-2xl shadow-black/25 rounded-xl overflow-hidden ring-1 ring-black/10" style={{ "--rot": "-2deg", transform: "rotate(-2deg)", animationDelay: "2.1s", zIndex: 3 } as React.CSSProperties}>
              <DocSVG doc={heroPicks[2].design} width="100%" />
            </div>
            <div className="absolute left-[8%] bottom-[10%] bg-surface border border-line rounded-xl shadow-lg px-3.5 py-2.5 flex items-center gap-2 anim-float" style={{ animationDelay: ".6s", zIndex: 4 }}>
              <span className="w-2 h-2 rounded-full bg-accent" style={{ animation: "pulseDot 1.6s infinite" }} />
              <span className="text-[12px] font-bold text-ink">Exported 4320 × 4320</span>
            </div>
          </div>
        </div>

        {/* Platform strip */}
        <Reveal className="mt-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint mb-3">Every format you post to</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button key={p.id} onClick={() => nav("/templates?platform=" + p.id)}
                className="px-3.5 py-2 rounded-full border border-line bg-surface text-[12.5px] font-semibold text-sub hover:border-accent hover:text-accent transition-colors cursor-pointer">
                {p.label} <span className="text-faint font-medium">· {p.width}×{p.height}</span>
              </button>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Template gallery */}
      <section id="templates" className="border-y border-line bg-surface py-16">
        <div className="max-w-6xl mx-auto px-5">
          <Reveal className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-accent mb-2">Template library</p>
              <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">Real templates, fully editable.</h2>
            </div>
            <Link to="/templates" className="flex items-center gap-1.5 text-sm font-bold text-accent hover:gap-2.5 transition-all">
              Browse all {TEMPLATES.length} templates <ArrowUpRight size={16} />
            </Link>
          </Reveal>
        </div>
        <div className="overflow-x-auto pb-4 [scrollbar-width:thin]">
          <div className="flex gap-4 px-5 max-w-6xl mx-auto w-max">
            {gallery.map((t, i) => (
              <Reveal key={t.id} delay={Math.min(i * 60, 360)} className="w-52 shrink-0">
                <button onClick={() => nav(`/templates?q=${encodeURIComponent(t.name)}`)}
                  className="group text-left cursor-pointer w-full">
                  <div className="rounded-xl overflow-hidden ring-1 ring-black/10 shadow-md shadow-black/5 group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300">
                    <DocSVG doc={t.design} width="100%" />
                  </div>
                  <div className="flex items-center justify-between mt-2.5 px-0.5">
                    <p className="text-[13px] font-bold text-ink truncate">{t.name}</p>
                    {t.premium && <span className="text-[9.5px] font-bold uppercase text-gold bg-gold-soft px-1.5 py-0.5 rounded">Pro</span>}
                  </div>
                  <p className="text-[11px] text-faint px-0.5 mt-0.5">{t.category} · {t.width}×{t.height}</p>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Editor showcase */}
      <section id="editor" className="max-w-6xl mx-auto px-5 py-20">
        <Reveal className="max-w-2xl mb-12">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-accent mb-2">The editor</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">A calm canvas with professional muscles.</h2>
          <p className="text-sub mt-3 leading-relaxed">Konva-powered rendering, snap guides, safe zones, layers, undo history and autosave — everything a fast social workflow needs, nothing it doesn't.</p>
        </Reveal>

        <div className="grid lg:grid-cols-[1.35fr_1fr] gap-6">
          <Reveal>
            <div className="rounded-2xl border border-line bg-editor p-4 shadow-xl shadow-black/8">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-line2" /><span className="w-2.5 h-2.5 rounded-full bg-line2" /><span className="w-2.5 h-2.5 rounded-full bg-line2" /></span>
                <span className="ml-2 text-[11px] font-bold text-faint bg-surface px-2.5 py-1 rounded-md border border-line">editor / festival-jewellery-sale</span>
                <span className="ml-auto text-[10.5px] font-bold text-accent flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-accent" />Saved</span>
              </div>
              <div className="rounded-xl overflow-hidden ring-1 ring-black/10 max-w-sm mx-auto relative">
                <DocSVG doc={heroPicks[0].design} width="100%" />
                <div className="absolute border-2 border-accent rounded-sm" style={{ left: "30%", top: "36%", width: "40%", height: "24%" }}>
                  <span className="absolute -top-1 -left-1 w-2 h-2 bg-white border-2 border-accent rounded-full" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-white border-2 border-accent rounded-full" />
                  <span className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border-2 border-accent rounded-full" />
                  <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border-2 border-accent rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 mt-3 text-[11px] font-bold text-faint">
                <span className="flex items-center gap-1.5"><MousePointer2 size={12} /> Snap guides</span>
                <span className="flex items-center gap-1.5"><Layers size={12} /> 8 layers</span>
                <span className="flex items-center gap-1.5"><Download size={12} /> PNG · 4×</span>
              </div>
            </div>
          </Reveal>

          <div className="grid gap-4 content-start">
            {[
              { icon: <Crop size={17} />, title: "Smart crop & fit", body: "Drop any photo into a template placeholder — it's fitted, centred and masked to the frame. Crop presets for every ratio from 1:1 to 9:16." },
              { icon: <Sparkles size={17} />, title: "Built-in AI assistant", body: "Describe the post — “jewellery shop, 20% festival discount” — and get headline, offer, CTA and palette suggestions you apply with one click." },
              { icon: <Type size={17} />, title: "A real type system", body: "Eight font families, eight text roles from headline to price tag, tracking, leading and effects." },
              { icon: <Palette size={17} />, title: "Brand Kit", body: "Lock your logo, four brand colours and font pairing — apply them across any design instantly." },
              { icon: <Download size={17} />, title: "High-resolution export", body: "Render PNG, JPG, WebP or PDF at up to 4× scale. A 1080² post leaves at 4320² — print sharp." },
            ].map((f, i) => (
              <Reveal key={f.title} delay={i * 70}>
                <div className="flex gap-3.5 p-4.5 rounded-xl border border-line bg-surface hover:border-accent/40 hover:-translate-y-0.5 transition-all duration-200">
                  <span className="w-9 h-9 shrink-0 rounded-lg bg-accent/10 text-accent flex items-center justify-center">{f.icon}</span>
                  <div>
                    <h3 className="font-display font-bold text-[15px]">{f.title}</h3>
                    <p className="text-[13px] text-sub leading-relaxed mt-1">{f.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="border-y border-line bg-surface py-16">
        <div className="max-w-6xl mx-auto px-5">
          <Reveal className="mb-10">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-accent mb-2">The workflow</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">Image in. Ready-to-post creative out.</h2>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { n: "01", t: "Choose a format", d: "Instagram, Reels, YouTube, LinkedIn, Pinterest, WhatsApp — or exact custom dimensions." },
              { n: "02", t: "Pick a template", d: "90+ layouts as editable JSON, not flat images. Search “jewellery sale” and it just works." },
              { n: "03", t: "Upload & smart-fit", d: "Your photo is auto-cropped into the frame. Fine-tune with zoom, pan and ratio presets." },
              { n: "04", t: "Customize & export", d: "Swap text, apply brand colours, preview in a phone mockup, export up to 4× resolution." },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div className="relative p-5 rounded-xl border border-line bg-bg h-full">
                  <span className="font-display font-bold text-[13px] text-accent">{s.n}</span>
                  <h3 className="font-display font-bold text-[17px] mt-2.5">{s.t}</h3>
                  <p className="text-[13px] text-sub leading-relaxed mt-2">{s.d}</p>
                  {i < 3 && <ArrowRight size={15} className="hidden lg:block absolute top-1/2 -right-4 text-line2 z-10" />}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-5 py-20">
        <div className="grid md:grid-cols-3 gap-5 items-start">
          {[
            { q: "Our jewellery sale posts went from Canva-generic to campaign-grade in an afternoon. The template search is scary good.", a: "Priya N.", r: "Boutique owner, Jaipur", off: "md:translate-y-6" },
            { q: "4× export alone is worth it. We print the same file we post. One tool, zero re-exports.", a: "Marco D.", r: "Marketing lead, F&B group", off: "" },
            { q: "The AI assistant drafts the copy, the brand kit keeps it on-brand. My approval rounds halved.", a: "Sana K.", r: "Freelance social manager", off: "md:translate-y-12" },
          ].map((t, i) => (
            <Reveal key={t.a} delay={i * 90} className={t.off}>
              <figure className="p-6 rounded-2xl border border-line bg-surface">
                <div className="flex gap-0.5 text-gold mb-3.5" aria-hidden>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <svg key={j} width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7L12 17.3 5.8 21l1.6-7L2 9.3l7.1-.7z" /></svg>
                  ))}
                </div>
                <blockquote className="text-[14.5px] leading-relaxed text-ink">“{t.q}”</blockquote>
                <figcaption className="mt-4 text-[12px] font-bold text-sub">{t.a} <span className="text-faint font-medium">· {t.r}</span></figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-line bg-surface py-20">
        <div className="max-w-6xl mx-auto px-5">
          <Reveal className="text-center max-w-xl mx-auto mb-12">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-accent mb-2">Pricing</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">Start free. Upgrade when you ship more.</h2>
            <p className="text-sub text-sm mt-3">Checkout runs on Stripe in production — plans below are wired for it, no fake charges here.</p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto items-stretch">
            {[
              { name: "Free", price: "$0", per: "forever", feats: ["20+ free templates", "Standard 1–2× exports", "Up to 10 projects", "All platform presets"], cta: "Start free", hot: false },
              { name: "Pro", price: "$9", per: "/ month", feats: ["All 90+ premium templates", "4× high-resolution export", "Brand Kit & AI assistant", "Unlimited projects", "Version history"], cta: "Upgrade to Pro", hot: true },
              { name: "Business", price: "$24", per: "/ month", feats: ["Everything in Pro", "Team seats & shared brand kits", "Collaboration (roadmap)", "Advanced permissions"], cta: "Contact sales", hot: false },
            ].map((p, i) => (
              <Reveal key={p.name} delay={i * 90}>
                <div className={cx("relative h-full p-6 rounded-2xl border flex flex-col", p.hot ? "border-accent bg-bg shadow-xl shadow-accent/10" : "border-line bg-bg")}>
                  {p.hot && <span className="absolute -top-3 left-6 bg-accent text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">Most popular</span>}
                  <h3 className="font-display font-bold text-lg">{p.name}</h3>
                  <p className="mt-2"><span className="font-display font-bold text-4xl tracking-tight">{p.price}</span> <span className="text-sub text-sm">{p.per}</span></p>
                  <ul className="mt-5 space-y-2.5 flex-1">
                    {p.feats.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[13.5px] text-sub">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-accent mt-0.5 shrink-0"><path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button variant={p.hot ? "primary" : "outline"} className="mt-6 w-full" onClick={() => toast(p.name === "Business" ? "Sales will reach out — integration point ready." : "Stripe checkout will be wired here in production.", "info")}>
                    {p.cta}
                  </Button>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-5 py-20">
        <Reveal className="mb-10">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-accent mb-2">FAQ</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">Quick answers.</h2>
        </Reveal>
        <div className="space-y-2.5">
          {[
            ["Do templates stay editable after I use one?", "Yes. Every template is stored as structured JSON — text, images, shapes and layout are all live elements you can move, restyle or delete."],
            ["How does the 4× export work?", "The document is re-rendered on an offscreen Konva stage at the target pixel ratio, so a 1080×1080 design exports as a true 4320×4320 file — not an upscaled screenshot."],
            ["Is the AI assistant connected to a real model?", "Suggestion drafting ships with a built-in local engine so nothing fakes a response. The provider interface is ready for an OpenAI/Anthropic key in production."],
            ["Where is my work stored?", "In this browser via a storage adapter that mirrors the Supabase schema (designs, versions, assets, brand kits) — swapping in a real backend touches one module."],
            ["Can I resize a post into a story?", "Yes — the resize tool re-lays out elements proportionally, keeps type hierarchy, and clamps everything into the new canvas instead of stretching it."],
          ].map(([q, a], i) => (
            <Reveal key={q} delay={i * 50}>
              <div className="border border-line rounded-xl bg-surface overflow-hidden">
                <button onClick={() => setFaqOpen(faqOpen === i ? null : i)} aria-expanded={faqOpen === i}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer hover:bg-surface2/60 transition-colors">
                  <span className="font-display font-bold text-[15px]">{q}</span>
                  <ChevronDown size={17} className={cx("text-faint transition-transform duration-200 shrink-0", faqOpen === i && "rotate-180")} />
                </button>
                {faqOpen === i && <p className="px-5 pb-4 text-[13.5px] text-sub leading-relaxed anim-fade-in">{a}</p>}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA + footer */}
      <section className="border-t border-line bg-ink text-bg">
        <div className="max-w-6xl mx-auto px-5 py-16 flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
          <div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">Your next post could look like a campaign.</h2>
            <p className="text-bg/60 mt-2 text-[15px]">Free to start · templates in seconds · export in one click.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Button size="lg" onClick={() => nav("/dashboard")}><LayoutTemplate size={16} /> Open the studio</Button>
            <Button size="lg" variant="ghost" className="text-bg/80 hover:bg-white/10 hover:text-bg" onClick={() => nav("/templates")}>Browse templates</Button>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center gap-4 justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center"><svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 14V2h10v2.6H6.2v2.9h5.6v2.6H6.2V14H3Z" fill="#fff" /></svg></span>
              <span className="font-display font-bold text-[15px]">Format Studio</span>
            </div>
            <nav className="flex gap-5 text-[12.5px] text-bg/50 font-medium" aria-label="Footer">
              <Link to="/templates" className="hover:text-bg transition-colors">Templates</Link>
              <Link to="/brand-kit" className="hover:text-bg transition-colors">Brand Kit</Link>
              <Link to="/login" className="hover:text-bg transition-colors">Sign in</Link>
            </nav>
            <p className="text-[12px] text-bg/40">Crafted for people who post daily. © 2026</p>
          </div>
        </div>
      </section>
    </div>
  );
}
