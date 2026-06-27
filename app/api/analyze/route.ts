import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SOLUTIONS } from "@/app/portal/solutions";
import pool from "@/lib/db";

export const runtime = "nodejs";

export type AnalysisResult = {
  solution: string;
  match: number;
  reasoning: string;
  keyBenefit: string;
};

async function loadKBContext(): Promise<string> {
  try {
    const { rows } = await pool.query(
      "SELECT name, content FROM knowledge_base ORDER BY updated_at DESC LIMIT 20"
    );
    if (!rows.length) return "";
    return rows
      .map((r: { name: string; content: string }) => `=== ${r.name} ===\n${r.content}`)
      .join("\n\n");
  } catch {
    return ""; // KB is optional — don't block analysis if DB is unavailable
  }
}

export async function POST(req: NextRequest) {
  const { requirement } = await req.json().catch(() => ({}));
  if (!requirement || typeof requirement !== "string" || requirement.trim().length < 10) {
    return NextResponse.json({ error: "Please describe your security requirement (at least 10 characters)." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Solution analyzer is not configured. Contact your CRS account manager." }, { status: 503 });
  }

  const [kbContext] = await Promise.all([loadKBContext()]);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  const solutionList = SOLUTIONS.filter(s => !s.comingSoon)
    .map(s =>
      `${s.name} (${s.category})\nOverview: ${s.overview}\nUSPs: ${s.usps.join("; ")}\nICP: ${s.icp.join("; ")}`
    )
    .join("\n\n---\n\n");

  const kbSection = kbContext
    ? `\nADDITIONAL KNOWLEDGE BASE CONTEXT (use this to refine your analysis):\n${kbContext}\n`
    : "";

  const prompt = `You are a senior cybersecurity solutions advisor for CRS (Cyber Retaliator Solutions), a value-added distributor operating across Africa.

A partner or prospect has described the following security requirement or challenge:
"${requirement.trim()}"

Evaluate how well each CRS solution addresses this requirement. Rate each from 0–100%.

CRS SOLUTIONS:
${solutionList}
${kbSection}
Return ONLY a valid JSON array (no markdown, no explanation). Each object:
{
  "solution": "<exact solution name>",
  "match": <integer 0-100>,
  "reasoning": "<1-2 sentences on why this solution fits or doesn't fit>",
  "keyBenefit": "<single most relevant capability for this requirement>"
}

Rules:
- Sort descending by match
- Only include solutions with match >= 15%
- Be specific — reference the actual requirement in your reasoning`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

  let analysis: AnalysisResult[];
  try {
    analysis = JSON.parse(cleaned);
    if (!Array.isArray(analysis)) throw new Error("not array");
  } catch {
    console.error("[analyze] Gemini response parse failed:", raw.slice(0, 200));
    return NextResponse.json({ error: "Failed to parse AI analysis. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ analysis });
}
