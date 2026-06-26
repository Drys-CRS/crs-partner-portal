"use client";
import { useState } from "react";
import { Sparkles, Loader2, ChevronRight, AlertCircle } from "lucide-react";
import type { AnalysisResult } from "@/app/api/analyze/route";

type Props = {
  onSelectSolution?: (name: string) => void;
};

export default function SolutionAnalyzer({ onSelectSolution }: Props) {
  const [requirement, setRequirement] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResult[] | null>(null);
  const [error, setError] = useState("");

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResults(null);

    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requirement }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok || data.error) {
      setError(data.error ?? "Analysis failed. Please try again.");
    } else {
      setResults(data.analysis);
    }
  }

  function matchColor(pct: number) {
    if (pct >= 80) return "bg-emerald-500";
    if (pct >= 60) return "bg-gold-400";
    if (pct >= 40) return "bg-amber-500";
    return "bg-slate-500";
  }

  function matchLabel(pct: number) {
    if (pct >= 80) return "Strong match";
    if (pct >= 60) return "Good match";
    if (pct >= 40) return "Partial match";
    return "Low match";
  }

  return (
    <div className="rounded-2xl border border-gold-400/30 bg-gold-950/20 dark:bg-gold-950/10 p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-gold-400/20 p-2">
          <Sparkles className="h-5 w-5 text-gold-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">AI Solution Matcher</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Describe a security requirement or challenge and AI will match the best CRS solutions with a fit percentage.
          </p>
        </div>
      </div>

      {/* Input */}
      <form onSubmit={analyze} className="space-y-3">
        <textarea
          value={requirement}
          onChange={e => setRequirement(e.target.value)}
          rows={3}
          placeholder="e.g. We need to monitor for compromised employee credentials and detect insider threats across our M365 environment..."
          className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 resize-none"
        />
        <button
          type="submit"
          disabled={loading || requirement.trim().length < 10}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-400 hover:bg-gold-300 text-slate-900 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Analysing…</>
          ) : (
            <><Sparkles className="h-4 w-4" /> Find Solutions</>
          )}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="flex gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Results */}
      {results && results.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {results.length} solution{results.length !== 1 ? "s" : ""} matched
          </p>
          {results.map(r => (
            <div
              key={r.solution}
              className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">{r.solution}</span>
                  <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{matchLabel(r.match)}</span>
                </div>
                <span className="text-2xl font-bold text-gold-500 dark:text-gold-400 tabular-nums shrink-0">
                  {r.match}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${matchColor(r.match)}`}
                  style={{ width: `${r.match}%` }}
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-sm text-slate-600 dark:text-slate-300">{r.reasoning}</p>
                <p className="text-xs text-gold-600 dark:text-gold-400 font-medium">
                  Key benefit: {r.keyBenefit}
                </p>
              </div>

              {onSelectSolution && (
                <button
                  onClick={() => onSelectSolution(r.solution)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-gold-600 dark:text-gold-400 hover:text-gold-500 dark:hover:text-gold-300 transition-colors"
                >
                  View solution <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {results && results.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
          No strong matches found. Try rephrasing your requirement with more detail.
        </p>
      )}
    </div>
  );
}
