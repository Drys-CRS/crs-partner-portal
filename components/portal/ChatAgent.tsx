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

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^### (.+)$/gm, '<p class="font-semibold text-white mt-3 mb-1">$1</p>')
    .replace(/^## (.+)$/gm, '<p class="font-bold text-white mt-4 mb-1">$1</p>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/(<li[\s\S]*?<\/li>\n?)+/g, s => `<ul class="space-y-0.5 my-1">${s}</ul>`)
    .replace(/\n\n/g, '<br class="my-1" />')
    .replace(/\n/g, " ");
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      setMessages(prev => [
        ...prev,
        { role: "agent", content: data.response ?? data.error ?? "Something went wrong." },
      ]);
    } catch {
      setMessages(prev => [...prev, { role: "agent", content: "Network error — please try again." }]);
    }
    setLoading(false);
  }

  return (
    <div className={`rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full px-5 py-4 flex items-center gap-3 border-b border-slate-800 hover:bg-slate-800/50 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-full bg-gold-400/20 border border-gold-400/30 flex items-center justify-center shrink-0">
          <Bot className="h-4 w-4 text-gold-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm">{title}</p>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-500 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
        )}
      </button>

      {open && (
        <>
          {/* Messages */}
          <div className="overflow-y-auto p-4 space-y-4 min-h-[180px] max-h-[420px] scrollbar-none">
            {messages.length === 0 && (
              <div className="text-center text-slate-500 text-sm py-8">
                <Bot className="h-9 w-9 mx-auto mb-3 text-slate-700" />
                <p className="text-slate-400">
                  {solutionContext
                    ? `Ask me anything about ${solutionContext} or how to position it to your customers.`
                    : "Ask me anything about the CRS portfolio."}
                </p>
                <p className="text-xs mt-1 text-slate-600">I'll help you position our solutions and close more deals.</p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  m.role === "agent"
                    ? "bg-gold-400/20 border border-gold-400/30"
                    : "bg-slate-700"
                }`}>
                  {m.role === "agent"
                    ? <Bot className="h-3.5 w-3.5 text-gold-400" />
                    : <User className="h-3.5 w-3.5 text-slate-400" />}
                </div>
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "agent"
                      ? "bg-slate-800 text-slate-200"
                      : "bg-gold-400/20 text-white"
                  }`}
                  dangerouslySetInnerHTML={
                    m.role === "agent"
                      ? { __html: renderMarkdown(m.content) }
                      : undefined
                  }
                >
                  {m.role === "user" ? m.content : undefined}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gold-400/20 border border-gold-400/30 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-gold-400" />
                </div>
                <div className="bg-slate-800 rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-gold-400" />
                  <span className="text-sm text-slate-400">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/80">
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder={placeholder}
                rows={2}
                className="flex-1 resize-none rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400 transition-colors"
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="p-2.5 rounded-xl bg-gold-400 hover:bg-gold-300 text-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-1.5 text-right">Enter to send · Shift+Enter for new line</p>
          </div>
        </>
      )}
    </div>
  );
}
