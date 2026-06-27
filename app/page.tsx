import Link from "next/link";
import Image from "next/image";
import { Lock, BarChart3, FileText, ArrowRight, Users } from "lucide-react";
import ChatAgent from "@/components/portal/ChatAgent";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">

      {/* Nav */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/crs-logo.png" alt="CRS" width={40} height={40} className="h-9 w-auto" />
          <span className="font-bold tracking-tight">Partner Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login"
            className="text-sm text-slate-400 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link href="/signup"
            className="text-sm px-4 py-2 rounded-lg bg-gold-600 hover:bg-gold-500 text-white font-semibold transition-colors">
            Apply for access
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 py-12">
        <div className="max-w-5xl mx-auto space-y-14">

          {/* Hero + Chat */}
          <div className="grid lg:grid-cols-2 gap-10 items-start">

            {/* Left: branding */}
            <div className="flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold-900/40 border border-gold-700/50 text-gold-400 text-xs font-medium mb-6 w-fit">
                <Users className="h-3.5 w-3.5" />
                Authorised Partner Access Only
              </div>
              <Image src="/crs-logo.png" alt="Cyber Retaliator Solutions" width={80} height={80}
                className="h-16 w-auto mb-6" />
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight mb-4">
                The CRS Partner{" "}
                <span className="text-gold-400">Portal</span>
              </h1>
              <p className="text-slate-400 text-lg leading-relaxed mb-8">
                Exclusive resources, deal intelligence, and sales enablement for
                Cyber Retaliator Solutions authorised partners.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/signup"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gold-600 hover:bg-gold-500 text-white font-semibold transition-colors text-sm">
                  Become a Partner
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/login"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-700 hover:border-gold-700 text-slate-300 hover:text-white font-semibold transition-colors text-sm">
                  Partner Sign In
                </Link>
              </div>
            </div>

            {/* Right: AI Agent */}
            <ChatAgent
              title="CRS Pre-Sales AI Agent"
              subtitle="Ask about our cybersecurity portfolio, solution positioning, or partner incentives."
              placeholder="e.g. My customer is struggling with lateral movement detection in their hybrid cloud…"
              defaultOpen={true}
            />
          </div>

          {/* Features */}
          <section className="border-t border-slate-800 pt-12">
            <div className="grid sm:grid-cols-3 gap-8">
              <Feature icon={<FileText className="h-5 w-5 text-gold-400" />} title="Tiered Resources">
                Access sales decks, technical briefs, and marketing collateral matched to your partner tier.
              </Feature>
              <Feature icon={<BarChart3 className="h-5 w-5 text-gold-400" />} title="Deal Intelligence">
                Stay ahead with market insights and competitive positioning content reserved for CRS partners.
              </Feature>
              <Feature icon={<Lock className="h-5 w-5 text-gold-400" />} title="Secure Access">
                Passwordless magic-link login. No credentials to manage, no shared passwords.
              </Feature>
            </div>
          </section>

        </div>
      </main>

      <footer className="border-t border-slate-800 px-6 py-6 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} Cyber Retaliator Solutions. All rights reserved.
      </footer>

    </div>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="w-9 h-9 rounded-lg bg-slate-800 border border-gold-900/40 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{children}</p>
    </div>
  );
}
