"use client";
import { useState } from "react";
import { ShieldCheck, Loader2, Mail, CheckCircle, AlertCircle } from "lucide-react";

type State = "idle" | "loading" | "sent" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [errMsg, setErrMsg] = useState("");

  // Show expired notice if redirected with ?error=expired
  const expired = typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("error") === "expired";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (res.ok) {
        setState("sent");
      } else {
        const d = await res.json().catch(() => ({}));
        setErrMsg(d.error || "Something went wrong. Please try again.");
        setState("error");
      }
    } catch {
      setErrMsg("Network error — check your connection.");
      setState("error");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-5">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <ShieldCheck className="h-8 w-8 text-teal-400" />
          <span className="text-xl font-bold text-white tracking-tight">CRS Partner Portal</span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">

          {expired && state === "idle" && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-amber-900/30 border border-amber-700 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-300">Your session expired. Enter your email to get a new link.</p>
            </div>
          )}

          {state === "sent" ? (
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-teal-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-white mb-2">Check your inbox</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                We sent a login link to <strong className="text-slate-200">{email}</strong>.
                It expires in 15 minutes.
              </p>
              <button onClick={() => { setState("idle"); setEmail(""); }}
                className="mt-6 text-sm text-teal-400 hover:text-teal-300 underline underline-offset-2">
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-white mb-1">Sign in</h1>
              <p className="text-sm text-slate-400 mb-6">
                Enter your partner email and we&apos;ll send you a secure login link.
              </p>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="email" required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                    />
                  </div>
                </div>

                {state === "error" && (
                  <div className="flex items-start gap-2 text-rose-400 text-sm">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {errMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={state === "loading" || !email.trim()}
                  className="w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {state === "loading"
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                    : "Send Login Link"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          Not a partner yet?{" "}
          <a href="/signup" className="text-slate-500 hover:text-slate-400 underline underline-offset-2">
            Apply for access
          </a>
        </p>
        <p className="text-center text-xs text-slate-700 mt-2">
          Cyber Retaliator Solutions — Authorised Partners Only
        </p>
      </div>
    </div>
  );
}
