"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, ChevronDown, ChevronUp } from "lucide-react";

type Message = { role: "user" | "agent"; content: string };

type Props = {
  title?: string;
  subtitle?: string;
  placeholder?: string;
  solutionContext?: string;
  defaultOpen?: boolean;
  className?: string;
};

function renderMarkdown(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeList = () => {
    if (inUl) { out.push("</ul>"); inUl = false; }
    if (inOl) { out.push("</ol>"); inOl = false; }
  };

  const styleLine = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/#RETALIATORNATION/g, '<span class="font-bold text-gold-500 dark:text-gold-400">#RETALIATORNATION</span>')
      .replace(/#(\w+)/g, '<span class="text-gold-600 dark:text-gold-400">#$1</span>');

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Horizontal rule
    if (/^---+$/.test(line)) {
      closeList();
      out.push('<hr class="border-gray-200 dark:border-slate-700 my-3" />');
      continue;
    }

    // Headings
    const h3 = line.match(/^### (.+)/);
    if (h3) {
      closeList();
      out.push(`<p class="font-semibold text-slate-800 dark:text-white mt-4 mb-1 text-sm">${styleLine(h3[1])}</p>`);
      continue;
    }
    const h2 = line.match(/^## (.+)/);
    if (h2) {
      closeList();
      out.push(`<p class="font-bold text-slate-900 dark:text-white mt-5 mb-1">${styleLine(h2[1])}</p>`);
      continue;
    }
    const h1 = line.match(/^# (.+)/);
    if (h1) {
      closeList();
      out.push(`<p class="font-bold text-slate-900 dark:text-white text-base mt-5 mb-1">${styleLine(h1[1])}</p>`);
      continue;
    }

    // Unordered list
    const ul = line.match(/^[-*•]\s+(.+)/);
    if (ul) {
      if (inOl) { out.push("</ol>"); inOl = false; }
      if (!inUl) { out.push('<ul class="space-y-1 my-2 ml-1">'); inUl = true; }
      out.push(`<li class="flex gap-2"><span class="text-gold-500 mt-0.5 shrink-0">•</span><span>${styleLine(ul[1])}</span></li>`);
      continue;
    }

    // Ordered list
    const ol = line.match(/^\d+\.\s+(.+)/);
    if (ol) {
      if (inUl) { out.push("</ul>"); inUl = false; }
      if (!inOl) { out.push('<ol class="space-y-1 my-2 ml-1 list-none counter-reset-item">'); inOl = true; }
      const idx = out.filter(l => l.startsWith("<li")).length + 1;
      out.push(`<li class="flex gap-2"><span class="text-gold-500 font-semibold shrink-0 min-w-[1.2rem]">${idx}.</span><span>${styleLine(ol[1])}</span></li>`);
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      closeList();
      out.push('<div class="h-2"></div>');
      continue;
    }

    // Normal paragraph
    closeList();
    out.push(`<p class="leading-relaxed">${styleLine(line)}</p>`);
  }

  closeList();
  return out.join("");
}

export default function ChatAgent({
  title = "CRS Pre-Sales AI Agent",
  subtitle = "Ask about solutions, pricing, or how to position CRS to your customers.",
  placeholder = "e.g. My customer needs to detect lateral movement in their hybrid cloud…",
  solutionContext,
  defaultOpen = true,
  className = "",
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(defaultOpen);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    const allMessages = [...messages, userMessage];
    setMessages(allMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages.map(m => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content,
          })),
          solutionContext,
        }),
      });
      const data = await res.json();
      const agentContent: string = data.response ?? data.error ?? "Something went wrong.";
      setMessages(prev => [...prev, { role: "agent", content: agentContent }]);

      fetch("/api/chat/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerQuery: text, agentResponse: agentContent }),
      }).catch(() => {});
    } catch {
      setMessages(prev => [...prev, { role: "agent", content: "Network error — please try again." }]);
    }
    setLoading(false);
  }

  return (
    <div className={`rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full px-5 py-4 flex items-center gap-3 border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-full bg-gold-400/20 border border-gold-400/30 flex items-center justify-center shrink-0">
          <Bot className="h-4 w-4 text-gold-500 dark:text-gold-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white text-sm">{title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{subtitle}</p>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
          : <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />}
      </button>

      {open && (
        <>
          {/* Messages */}
          <div className="overflow-y-auto p-4 space-y-4 min-h-[180px] max-h-[480px] scrollbar-none">
            {messages.length === 0 && (
              <div className="text-center text-slate-400 text-sm py-8">
                <Bot className="h-9 w-9 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                <p className="text-slate-500 dark:text-slate-400">
                  {solutionContext
                    ? `Ask me anything about ${solutionContext} or how to position it to your customers.`
                    : "Ask me anything about the CRS portfolio."}
                </p>
                <p className="text-xs mt-1 text-slate-400 dark:text-slate-600">I'll help you position our solutions and close more deals.</p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : "items-start"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                  m.role === "agent"
                    ? "bg-gold-400/20 border border-gold-400/30"
                    : "bg-gray-200 dark:bg-slate-700"
                }`}>
                  {m.role === "agent"
                    ? <Bot className="h-3.5 w-3.5 text-gold-500 dark:text-gold-400" />
                    : <User className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />}
                </div>
                {m.role === "agent" ? (
                  <div
                    className="max-w-[88%] rounded-xl rounded-tl-none border border-gray-100 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 space-y-0.5"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                  />
                ) : (
                  <div className="max-w-[80%] rounded-xl rounded-tr-none bg-gold-400/15 dark:bg-gold-400/20 border border-gold-400/30 px-4 py-2.5 text-sm text-slate-800 dark:text-white">
                    {m.content}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-full bg-gold-400/20 border border-gold-400/30 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="h-3.5 w-3.5 text-gold-500 dark:text-gold-400" />
                </div>
                <div className="rounded-xl rounded-tl-none border border-gray-100 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-gold-500 dark:text-gold-400" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/80">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={placeholder}
                rows={2}
                className="flex-1 resize-none rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition-colors"
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="p-2.5 rounded-xl bg-gold-400 hover:bg-gold-300 text-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-600 mt-1.5 text-right">Enter to send · Shift+Enter for new line</p>
          </div>
        </>
      )}
    </div>
  );
}
