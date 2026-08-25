import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Lock, User as UserIcon, Sparkles } from "lucide-react";
import { Logo } from "../components/shell";
import { Button, Field, Input } from "../components/ui";
import { useAppStore } from "../stores";
import DocSVG from "../components/DocSVG";
import { TEMPLATES } from "../lib/templateFactory";

export default function Auth({ mode }: { mode: "login" | "signup" | "forgot" }) {
  const nav = useNavigate();
  const { login, signup, toast } = useAppStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (mode !== "forgot" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setErr("Enter a valid email address."); return; }
    if (mode !== "forgot" && pass.length < 6) { setErr("Password needs at least 6 characters."); return; }
    if (mode === "signup" && name.trim().length < 2) { setErr("Tell us your name so designs get credited properly."); return; }
    setBusy(true);
    setTimeout(() => {
      if (mode === "login") {
        const r = login(email, pass);
        if (r) setErr(r); else nav("/dashboard");
      } else if (mode === "signup") {
        const r = signup(name.trim(), email, pass);
        if (r) setErr(r); else nav("/dashboard");
      } else {
        toast("If an account exists for that email, a reset link is on its way.", "success");
        nav("/login");
      }
      setBusy(false);
    }, 450);
  };

  const titles = {
    login: ["Welcome back", "Sign in to pick up exactly where you left off."],
    signup: ["Create your studio", "Free forever plan. No card, no watermark."],
    forgot: ["Reset password", "We'll email you a secure reset link."],
  }[mode];

  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1.1fr] bg-bg">
      {/* Form side */}
      <div className="flex flex-col p-6 sm:p-10">
        <div className="flex items-center justify-between">
          <Logo />
          <Link to="/" className="flex items-center gap-1.5 text-[13px] font-semibold text-sub hover:text-ink transition-colors"><ArrowLeft size={14} /> Back to site</Link>
        </div>
        <div className="flex-1 flex items-center">
          <form onSubmit={submit} className="w-full max-w-sm mx-auto anim-fade-up">
            <h1 className="font-display font-bold text-3xl tracking-tight">{titles[0]}</h1>
            <p className="text-sub text-[14px] mt-2">{titles[1]}</p>

            <div className="space-y-4 mt-8">
              {mode === "signup" && (
                <Field label="Full name">
                  <div className="relative">
                    <UserIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Asha Verma" className="pl-9" autoComplete="name" />
                  </div>
                </Field>
              )}
              <Field label="Email">
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@studio.com" className="pl-9" autoComplete="email" />
                </div>
              </Field>
              {mode !== "forgot" && (
                <Field label="Password">
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                    <Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" className="pl-9" autoComplete={mode === "login" ? "current-password" : "new-password"} />
                  </div>
                </Field>
              )}
              {err && (
                <p className="text-[13px] font-semibold text-danger bg-danger/8 border border-danger/20 rounded-lg px-3.5 py-2.5 anim-pop" role="alert">{err}</p>
              )}
              <Button type="submit" className="w-full" size="lg" disabled={busy}>
                {busy ? "One moment…" : mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
              </Button>
            </div>

            <div className="text-[13px] text-sub mt-6 space-y-1.5">
              {mode === "login" && <p>New here? <Link to="/signup" className="font-bold text-accent hover:underline">Create an account</Link> · <Link to="/forgot" className="hover:underline">Forgot password?</Link></p>}
              {mode === "signup" && <p>Already have an account? <Link to="/login" className="font-bold text-accent hover:underline">Sign in</Link></p>}
              {mode === "forgot" && <p>Remembered it? <Link to="/login" className="font-bold text-accent hover:underline">Back to sign in</Link></p>}
            </div>
            <p className="text-[11px] text-faint mt-6 leading-relaxed">Demo environment: authentication and data live in your browser. The auth service interface supports email + Google providers when a backend is connected.</p>
          </form>
        </div>
      </div>

      {/* Visual side */}
      <div className="hidden lg:flex items-center justify-center relative overflow-hidden border-l border-line bg-surface">
        <div className="absolute inset-0 dot-grid opacity-50" />
        <div className="relative grid grid-cols-2 gap-5 max-w-md rotate-[-3deg]">
          {[TEMPLATES[0], TEMPLATES[62], TEMPLATES[33], TEMPLATES[70]].map((t, i) => (
            <div key={t.id} className={i % 2 === 1 ? "translate-y-8" : ""}>
              <div className="rounded-xl overflow-hidden shadow-xl shadow-black/15 ring-1 ring-black/10 anim-float" style={{ animationDelay: `${i * 0.7}s` }}>
                <DocSVG doc={t.design} width="100%" />
              </div>
            </div>
          ))}
        </div>
        <div className="absolute bottom-8 left-8 flex items-center gap-2 text-[12px] font-bold text-sub bg-bg border border-line rounded-full px-3.5 py-2 shadow-sm">
          <Sparkles size={13} className="text-accent" /> 4 designs this week by studios like yours
        </div>
      </div>
    </div>
  );
}
