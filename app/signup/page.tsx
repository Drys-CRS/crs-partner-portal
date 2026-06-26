"use client";
import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Loader2, CheckCircle, AlertCircle } from "lucide-react";

type State = "idle" | "loading" | "done" | "error";

export default function SignupPage() {
  const [state, setState] = useState<State>("idle");
  const [errMsg, setErrMsg] = useState("");
  const [form, setForm] = useState({ name: "", email: "", company: "", phone: "", message: "" });

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setState("done");
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">

        <div className="flex items-center justify-center gap-2.5 mb-8">
          <ShieldCheck className="h-8 w-8 text-teal-400" />
          <span className="text-xl font-bold text-white tracking-tight">CRS Partner Portal</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          {state === "done" ? (
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-teal-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-white mb-2">Application received</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Thanks, <strong className="text-slate-200">{form.name}</strong>. We&apos;ll review your application
                and be in touch at <strong className="text-slate-200">{form.email}</strong>.
              </p>
              <Link href="/login"
                className="mt-6 inline-block text-sm text-teal-400 hover:text-teal-300 underline underline-offset-2">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-white mb-1">Apply for access</h1>
              <p className="text-sm text-slate-400 mb-6">
                Submit your details and our team will review your application.
              </p>

              <form onSubmit={submit} className="space-y-4">
                <Field label="Full name" required>
                  <input type="text" required value={form.name} onChange={set("name")}
                    placeholder="Jane Smith"
                    className={inputCls} />
                </Field>

                <Field label="Work email" required>
                  <input type="email" required value={form.email} onChange={set("email")}
                    placeholder="jane@company.com"
                    className={inputCls} />
                </Field>

                <Field label="Company" required>
                  <input type="text" required value={form.company} onChange={set("company")}
                    placeholder="Acme Security Ltd"
                    className={inputCls} />
                </Field>

                <Field label="Phone">
                  <input type="tel" value={form.phone} onChange={set("phone")}
                    placeholder="+27 11 000 0000"
                    className={inputCls} />
                </Field>

                <Field label="Why do you want to become a CRS Partner?">
                  <textarea value={form.message} onChange={set("message")} rows={3}
                    placeholder="Tell us about your business and how you'd like to partner with us."
                    className={`${inputCls} resize-none`} />
                </Field>

                {state === "error" && (
                  <div className="flex items-start gap-2 text-rose-400 text-sm">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {errMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={state === "loading" || !form.name.trim() || !form.email.trim() || !form.company.trim()}
                  className="w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {state === "loading"
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                    : "Submit Application"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          Already a partner?{" "}
          <Link href="/login" className="text-slate-500 hover:text-slate-400 underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
