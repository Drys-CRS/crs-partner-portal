"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import ResourceList from "@/components/portal/ResourceList";
import SolutionAnalyzer from "@/components/portal/SolutionAnalyzer";
import { SOLUTIONS } from "./solutions";
import {
  LogOut, Loader2, ExternalLink, CheckCircle2, ChevronRight,
  Users, Megaphone, Mail, Monitor, BookOpen, DollarSign, Presentation,
  Sun, Moon, Menu, X, LayoutGrid,
} from "lucide-react";

type User = { email: string; name: string };
type ContentItem = {
  id: string;
  title: string;
  group: string;
  description: string;
  content: string;
  documentUrl?: string;
  documentName?: string;
};

const VAD_OFFERINGS = [
  {
    icon: <Users className="h-5 w-5 text-gold-500" />,
    title: "Telesales Support",
    body: "Access to our Telesales Team that will make calls to your customers and set up meetings on your behalf.",
  },
  {
    icon: <Megaphone className="h-5 w-5 text-gold-500" />,
    title: "Brand Assets",
    body: "Access to logos, brand guidelines, and imagery to maintain brand consistency in your marketing.",
  },
  {
    icon: <Monitor className="h-5 w-5 text-gold-500" />,
    title: "Ready-Made Content",
    body: "Pre-made social media posts, captions, graphics, and tailored ad elements for you to use.",
  },
  {
    icon: <Mail className="h-5 w-5 text-gold-500" />,
    title: "Mass Mailing Campaigns",
    body: "Access to mass mailing campaigns to reach a wider audience effectively.",
  },
  {
    icon: <BookOpen className="h-5 w-5 text-gold-500" />,
    title: "Product Demonstrations",
    body: "Easily schedule product demonstrations to showcase offerings to potential clients at no cost.",
  },
  {
    icon: <DollarSign className="h-5 w-5 text-gold-500" />,
    title: "Pricing Visibility",
    body: "Access to pricing structures and available discounts to streamline sales and maximise profitability.",
  },
  {
    icon: <Presentation className="h-5 w-5 text-gold-500" />,
    title: "Webinars & Events",
    body: "We assist with setting up and presenting at your webinars and events.",
  },
];

export default function PortalPage() {
  const [user, setUser] = useState<User | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formErr, setFormErr] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("crs-theme") as "light" | "dark" | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    fetch("/api/content")
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { setUser(d.user); setContent(d.content); })
      .catch(() => setError("Failed to load content. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  function toggleTheme() {
    setTheme(t => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem("crs-theme", next);
      return next;
    });
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setSending(true); setFormErr("");
    const res = await fetch("/api/submit-form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSending(false);
    if (res.ok) { setSent(true); setForm({ name: "", email: "", message: "" }); }
    else setFormErr("Submission failed — please try again.");
  }

  async function logout() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    window.location.href = "/login";
  }

  function selectTab(name: string) {
    setActiveTab(name);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const activeSolution = SOLUTIONS.find(s => s.name === activeTab) ?? null;
  const tabContent = content.filter(c => c.group === activeTab);

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">

        {/* ── Header ────────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setSidebarOpen(o => !o)}
                className="lg:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle menu"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <Image src="/crs-logo.png" alt="CRS" width={40} height={40} className="h-9 w-auto" />
              <div>
                <span className="font-bold text-base tracking-tight block leading-tight">Partner Portal</span>
                <span className="text-xs text-slate-400 hidden sm:block">#RetaliatorNation</span>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {user && (
                <span className="text-sm text-slate-500 dark:text-slate-400 hidden md:block mr-2">{user.email}</span>
              )}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle light/dark mode"
              >
                {theme === "dark"
                  ? <Sun className="h-4 w-4" />
                  : <Moon className="h-4 w-4" />}
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:block">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex relative">
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-20 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* ── Sidebar ───────────────────────────────────────── */}
          <aside
            className={`
              fixed left-0 z-30 w-64 bottom-0
              bg-white dark:bg-slate-900
              border-r border-gray-200 dark:border-slate-800
              overflow-y-auto scrollbar-none
              transition-transform duration-200
              ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
              lg:translate-x-0
              top-[61px]
            `}
          >
            <nav className="p-3 space-y-0.5 pb-20">
              {/* Overview */}
              <button
                onClick={() => selectTab("overview")}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2.5 transition-colors ${
                  activeTab === "overview"
                    ? "bg-gold-400/20 text-gold-700 dark:text-gold-400 font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                }`}
              >
                <LayoutGrid className="h-4 w-4 shrink-0" />
                Overview
              </button>

              <div className="pt-4 pb-1.5 px-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Solutions
                </p>
              </div>

              {SOLUTIONS.filter(s => !s.comingSoon).map(s => (
                <button
                  key={s.name}
                  onClick={() => selectTab(s.name)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                    activeTab === s.name
                      ? "bg-gold-400/20 text-gold-700 dark:text-gold-400 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="truncate">{s.name}</span>
                </button>
              ))}

              <div className="pt-4 pb-1.5 px-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Coming Soon
                </p>
              </div>

              {SOLUTIONS.filter(s => s.comingSoon).map(s => (
                <button
                  key={s.name}
                  onClick={() => selectTab(s.name)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between gap-2 transition-colors ${
                    activeTab === s.name
                      ? "bg-gold-400/20 text-gold-700 dark:text-gold-400 font-semibold"
                      : "text-slate-500 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="truncate">{s.name.replace(" (Coming Soon)", "")}</span>
                  <span className="text-xs bg-gray-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500 px-1.5 py-0.5 rounded shrink-0">
                    Soon
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          {/* ── Main content ──────────────────────────────────── */}
          <main className="flex-1 lg:ml-64 px-4 sm:px-8 py-10 min-w-0 max-w-5xl">
            {loading && (
              <div className="flex items-center gap-3 text-slate-400 py-20 justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-gold-500" />
                Loading partner content…
              </div>
            )}
            {error && <p className="text-rose-500 py-10 text-center">{error}</p>}

            {!loading && !error && (
              <>
                {/* ── Overview ────────────────────────────────── */}
                {activeTab === "overview" && (
                  <div className="space-y-14">
                    {/* Welcome */}
                    <div className="border-l-4 border-gold-400 pl-5">
                      <h1 className="text-3xl font-bold tracking-tight">
                        Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}.
                      </h1>
                      <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-2xl">
                        You are accessing the CRS Partner Portal — your central hub for solution knowledge, sales resources, and support.
                      </p>
                    </div>

                    {/* Who We Are */}
                    <section>
                      <h2 className="text-xl font-bold mb-4">About Cyber Retaliator Solutions</h2>
                      <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 p-6 sm:p-8 space-y-3 text-slate-600 dark:text-slate-300 leading-relaxed">
                        <p>
                          Cyber Retaliator Solutions is an Authorised IBM Training Delivery Partner, RedHat, SUSE, Agile and CompTIA Training Delivery Partner, and a <strong className="text-slate-900 dark:text-white">Channel Focused Value-Added Cyber Security Distributor</strong> operating throughout the globe.
                        </p>
                        <p>
                          Our Head Office is based in Centurion, South Africa, with Training Centres in Centurion, Midrand, Sandton, and Cape Town. We are a future-focused business with 25+ years of experience, bringing world-class solutions to address key industry challenges across the African region and beyond.
                        </p>
                      </div>
                    </section>

                    {/* VAD Offerings */}
                    <section>
                      <h2 className="text-xl font-bold mb-1">What CRS Offers You as Your VAD</h2>
                      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                        Our marketing activities and materials are designed to help our partners capture audiences and drive business objectives.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {VAD_OFFERINGS.map(o => (
                          <div key={o.title} className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex gap-4">
                            <div className="mt-0.5 shrink-0">{o.icon}</div>
                            <div>
                              <p className="font-semibold text-sm">{o.title}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{o.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Solutions Grid */}
                    <section>
                      <h2 className="text-xl font-bold mb-1">Our Solution Portfolio</h2>
                      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                        Select a solution to view full details, sales resources, and partner content.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {SOLUTIONS.map(s => (
                          <button
                            key={s.name}
                            onClick={() => selectTab(s.name)}
                            className="text-left rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-gold-400/60 hover:bg-gold-50 dark:hover:bg-slate-800/70 p-5 transition-colors group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold group-hover:text-gold-700 dark:group-hover:text-gold-400 transition-colors">
                                  {s.name.replace(" (Coming Soon)", "")}
                                  {s.comingSoon && (
                                    <span className="ml-2 text-xs bg-gray-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full align-middle">
                                      Soon
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">{s.category}</p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-gold-500 shrink-0 mt-0.5 transition-colors" />
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{s.tagline}</p>
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* AI Solution Matcher */}
                    <section>
                      <SolutionAnalyzer onSelectSolution={selectTab} />
                    </section>

                    {/* Partner Incentives */}
                    <section className="rounded-2xl border border-gold-400/30 bg-gold-50 dark:bg-gold-950/20 p-6 sm:p-8">
                      <h2 className="text-lg font-bold text-gold-700 dark:text-gold-400 mb-3">Partner Incentives 2026</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-slate-600 dark:text-slate-300">
                        <div>
                          <p className="font-semibold mb-2">For Partners — CompTIA Vouchers</p>
                          <ul className="space-y-1 text-slate-500 dark:text-slate-400">
                            <li>$2 600–$5 300 opportunity → Exam Voucher</li>
                            <li>$5 300–$10 500 → Certmaster Training + Exam Voucher</li>
                            <li>$10 500+ → 2× Certmaster + 2× Exam Voucher</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-semibold mb-2">Market Development Funds (MDF)</p>
                          <ul className="space-y-1 text-slate-500 dark:text-slate-400">
                            <li>3-month $10k–$20k revenue → $1 000 MDF</li>
                            <li>3-month $20k–$50k revenue → $1 500 MDF</li>
                            <li>3-month $50k+ revenue → $3 000 MDF</li>
                          </ul>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Annual thresholds apply for annual MDF. Excludes monthly billing.</p>
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {/* ── Solution Tab ─────────────────────────────── */}
                {activeSolution && (
                  <div className="space-y-10">
                    {/* Solution Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-8">
                      <div>
                        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-gold-600 dark:text-gold-400 mb-2">
                          {activeSolution.category}
                        </span>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                          {activeSolution.name.replace(" (Coming Soon)", "")}
                          {activeSolution.comingSoon && (
                            <span className="text-sm font-normal bg-gray-100 dark:bg-slate-800 text-slate-500 px-2.5 py-1 rounded-full">
                              Coming Soon
                            </span>
                          )}
                        </h1>
                        <p className="mt-1 text-lg text-gold-600 dark:text-gold-400/80 font-medium">{activeSolution.tagline}</p>
                      </div>
                      <a
                        href={activeSolution.vendorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:border-gold-400 hover:text-gold-700 dark:hover:text-gold-400 transition-colors shrink-0"
                      >
                        Vendor Website <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>

                    {activeSolution.comingSoon ? (
                      <div className="rounded-2xl border border-dashed border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/30 p-12 text-center">
                        <p className="text-slate-500 text-lg mb-2">Coming Soon</p>
                        <p className="text-slate-400 text-sm">
                          {activeSolution.name.replace(" (Coming Soon)", "")} is being onboarded to the CRS partner portfolio.
                          Check back soon for full details and sales resources.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Overview */}
                        <section>
                          <h2 className="text-lg font-semibold mb-3">Overview</h2>
                          <p className="text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">{activeSolution.overview}</p>
                        </section>

                        {/* USPs + ICP */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <section className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                            <h2 className="text-base font-semibold mb-4 text-gold-700 dark:text-gold-400">Unique Selling Points</h2>
                            <ul className="space-y-2.5">
                              {activeSolution.usps.map((usp, i) => (
                                <li key={i} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                                  <CheckCircle2 className="h-4 w-4 text-gold-500 dark:text-gold-400 shrink-0 mt-0.5" />
                                  {usp}
                                </li>
                              ))}
                            </ul>
                          </section>

                          <section className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                            <h2 className="text-base font-semibold mb-4 text-gold-700 dark:text-gold-400">Ideal Customer Profile</h2>
                            <ul className="space-y-2.5">
                              {activeSolution.icp.map((item, i) => (
                                <li key={i} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </section>
                        </div>

                        {/* Resources */}
                        <section>
                          <h2 className="text-lg font-semibold mb-1">Partner Resources</h2>
                          <p className="text-slate-500 dark:text-slate-500 text-sm mb-5">
                            Documents, datasheets, and links for {activeSolution.name}.
                          </p>
                          <ResourceList items={tabContent} />
                        </section>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Contact Form */}
            {!loading && !error && (
              <section className="border-t border-gray-200 dark:border-slate-800 pt-12 mt-14 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Send a Message</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Need support or have a question for your account manager?
                  </p>
                </div>

                {sent ? (
                  <div className="rounded-xl bg-gold-50 dark:bg-gold-900/30 border border-gold-400/40 px-5 py-4 text-gold-700 dark:text-gold-300 text-sm">
                    Message received — we&apos;ll be in touch shortly.
                  </div>
                ) : (
                  <form onSubmit={submitForm} className="space-y-4 max-w-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Name</label>
                        <input
                          required
                          value={form.name}
                          onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                          className="w-full rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400"
                          placeholder="Jane Smith"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Email</label>
                        <input
                          required
                          type="email"
                          value={form.email}
                          onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                          className="w-full rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400"
                          placeholder="jane@company.com"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Message</label>
                      <textarea
                        required
                        rows={4}
                        value={form.message}
                        onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                        className="w-full rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 resize-none"
                        placeholder="How can we help?"
                      />
                    </div>
                    {formErr && <p className="text-rose-500 text-sm">{formErr}</p>}
                    <button
                      type="submit"
                      disabled={sending}
                      className="px-6 py-2.5 rounded-lg bg-gold-400 hover:bg-gold-300 text-slate-900 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? "Sending…" : "Send Message"}
                    </button>
                  </form>
                )}
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
