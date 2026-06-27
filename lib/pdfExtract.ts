import { GoogleGenerativeAI } from "@google/generative-ai";

function sanitize(text: string): string {
  return text.replace(/\0/g, "").replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
}

// Patch console.warn once per module to suppress pdfjs-dist TT: noise.
// Safe across concurrent calls — module-level state, no per-call swap.
let _warned = false;
function patchWarn() {
  if (_warned) return;
  const orig = console.warn;
  console.warn = (...a: unknown[]) => {
    if (typeof a[0] === "string" && a[0].startsWith("TT:")) return;
    orig(...a);
  };
  _warned = true;
}

/**
 * Extract text from a PDF buffer using two strategies:
 *
 * 1. pdf-parse  — fast, free, works for text-based PDFs
 * 2. Gemini Vision — fallback for scanned/image PDFs or malformed XRef tables
 *
 * Returns empty string if neither strategy yields content.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  // ── Strategy 1: pdf-parse ──────────────────────────────────────────────────
  patchWarn();
  try {
    const { default: pdfParse } = await import("pdf-parse") as unknown as {
      default: (buf: Buffer) => Promise<{ text: string }>;
    };
    const text = sanitize((await pdfParse(buffer)).text);
    if (text) return text;
    // Empty string means scanned/image PDF — fall through to vision
  } catch {
    // Malformed XRef, encrypted, or structural corruption — fall through
  }

  // ── Strategy 2: Gemini Vision ──────────────────────────────────────────────
  const apiKey = process.env.GOOGLE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) return "";

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: "application/pdf",
        },
      },
      "Extract all text content from this document. Output only the extracted text, preserving structure (headings, bullet points, tables). Do not add commentary, summaries, or analysis.",
    ]);

    return sanitize(result.response.text());
  } catch {
    return "";
  }
}
