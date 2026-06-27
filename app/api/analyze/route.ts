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

export type AnalyzeResponse = {
  generalAssessment: string;
  analysis: AnalysisResult[];
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
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const solutionList = SOLUTIONS.filter(s => !s.comingSoon)
    .map(s =>
      `${s.name} (${s.category})\nOverview: ${s.overview}\nUSPs: ${s.usps.join("; ")}\nICP: ${s.icp.join("; ")}`
    )
    .join("\n\n---\n\n");

  const kbSection = kbContext
    ? `\nADDITIONAL KNOWLEDGE BASE CONTEXT (use this to refine your analysis):\n${kbContext}\n`
    : "";

  const prompt = `You are a senior cybersecurity advisor with broad expertise across the entire cybersecurity landscape — threat detection, identity, DevSecOps, compliance, endpoint, cloud, dark web, VAPT, and more. You also represent CRS (Cyber Retaliator Solutions), a channel-focused VAD with a curated portfolio of best-of-breed solutions.

A partner has described the following cybersecurity requirement or challenge:
"${requirement.trim()}"

Your response must be a single valid JSON object (no markdown, no explanation outside JSON):
{
  "generalAssessment": "<3-5 sentence expert assessment covering: what this cybersecurity challenge actually is, the risk if unaddressed, the standard industry approach to solving it, and any important nuances a partner should know when positioning a solution to their customer>",
  "analysis": [
    {
      "solution": "<exact CRS solution name>",
      "match": <integer 0-100>,
      "reasoning": "<1-2 sentences on why this solution fits — reference the specific requirement>",
      "keyBenefit": "<single most compelling capability for this use case>"
    }
  ]
}

CRS SOLUTIONS to evaluate:
${solutionList}
${kbSection}
Rules for analysis array:
- Evaluate ALL CRS solutions against the requirement
- Sort descending by match
- Only include solutions with match >= 15%
- generalAssessment must be vendor-agnostic cybersecurity expertise — do not mention CRS or specific products there
- Be specific in reasoning — name exact product features that address the requirement`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

  let parsed: { generalAssessment?: string; analysis?: AnalysisResult[] };
  try {
    parsed = JSON.parse(cleaned);
    if (!parsed.analysis || !Array.isArray(parsed.analysis)) throw new Error("missing analysis array");
  } catch {
    console.error("[analyze] Gemini response parse failed:", raw.slice(0, 200));
    return NextResponse.json({ error: "Failed to parse AI analysis. Please try again." }, { status: 500 });
  }

  return NextResponse.json({
    generalAssessment: parsed.generalAssessment ?? "",
    analysis: parsed.analysis,
  });
}
