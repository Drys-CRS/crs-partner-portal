import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pool from "@/lib/db";

export const runtime = "nodejs";

const REVIEWER_PROMPT = `
<role>
You are the internal Sales Operations and Optimization Agent for Cyber Retaliator Solutions (CRS). You work in the background, supporting the primary CRS Pre-Sales Agent.

Your sole purpose is to analyze the interactions between CRS Partners and the primary Pre-Sales Agent, evaluate the accuracy of the response based on the CRS portfolio, and generate structured data to optimize the application's knowledge retrieval for future, similar queries.
</role>

<context>
The primary agent uses the CRS Partner Pack 2026 to answer partner questions regarding products (VECTRA, Flare, Aikido, BlueFlag Security, Strobes, Telivy, SMBsecure, Beachhead Secure, Standss, vRx, VAPT Services, Cyber Risk Essentials), pricing models, and partner incentives (MDF, Vouchers, Takealot vouchers).
</context>

<instructions>
You will be provided with a transcript containing:
1. <partner_query>: The question asked by the partner.
2. <agent_response>: The answer provided by the primary CRS Pre-Sales Agent.

Execute the following steps silently, then output ONLY a structured XML block:

Step 1: QA Evaluation
Analyze the response. Did the primary agent accurately represent the CRS portfolio? Did they invent pricing? Did they miss an obvious cross-sell opportunity?

Step 2: Intent Mapping
Distill the partner's query into a core, generalized intent. Remove specific partner names or unique identifiers.

Step 3: Search Optimization
Generate high-value keywords, synonyms, and semantic phrases that a future search system should use to route similar queries.

Step 4: Answer Compression
Draft a concise "FAQ Snippet" (2-4 sentences max) containing the factual core of the answer for zero-latency future responses.

<formatting_rules>
Output YOUR ENTIRE RESPONSE inside this XML structure only. No conversational filler outside the block.

<optimization_payload>
  <qa_flag>Pass/Fail - 1-sentence reason if failed</qa_flag>
  <core_intent>The generalized intent of the query</core_intent>
  <semantic_tags>
    <tag>keyword 1</tag>
    <tag>keyword 2</tag>
  </semantic_tags>
  <missed_opportunities>Any cross-sell or incentive mentions the primary agent missed</missed_opportunities>
  <cached_faq_answer>The optimized 2-4 sentence answer for future use</cached_faq_answer>
</optimization_payload>
</formatting_rules>
</instructions>
`.trim();

function extract(xml: string, tag: string): string {
  return new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`).exec(xml)?.[1]?.trim() ?? "";
}

function extractAll(xml: string, tag: string): string[] {
  return [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "g"))].map(m => m[1].trim());
}

export async function POST(req: NextRequest) {
  const { partnerQuery, agentResponse } = await req.json().catch(() => ({}));
  if (!partnerQuery || !agentResponse) {
    return NextResponse.json({ error: "partnerQuery and agentResponse required" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI not configured." }, { status: 503 });

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
    systemInstruction: REVIEWER_PROMPT,
  });

  const prompt = `<partner_query>${partnerQuery}</partner_query>\n\n<agent_response>${agentResponse}</agent_response>`;

  let rawXml: string;
  try {
    const result = await model.generateContent(prompt);
    rawXml = result.response.text().trim();
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  // Parse XML fields
  const qaFlag             = extract(rawXml, "qa_flag");
  const coreIntent         = extract(rawXml, "core_intent");
  const semanticTags       = extractAll(rawXml, "tag");
  const missedOpportunities = extract(rawXml, "missed_opportunities");
  const cachedFaqAnswer    = extract(rawXml, "cached_faq_answer");

  // Persist review
  await pool.query(
    `INSERT INTO chat_reviews
       (partner_query, agent_response, qa_flag, core_intent, semantic_tags, missed_opportunities, cached_faq_answer, raw_xml)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [partnerQuery, agentResponse, qaFlag, coreIntent, semanticTags, missedOpportunities, cachedFaqAnswer, rawXml]
  );

  // Auto-promote FAQ answer into knowledge_base so the primary agent learns from it
  if (cachedFaqAnswer && coreIntent) {
    const name = `FAQ: ${coreIntent.slice(0, 120)}`;
    // Use a stable source_url derived from intent so duplicates upsert cleanly
    const sourceUrl = `faq://` + encodeURIComponent(coreIntent.toLowerCase().replace(/\s+/g, "-").slice(0, 200));
    await pool.query(
      `INSERT INTO knowledge_base (name, source, source_url, content, updated_at)
       VALUES ($1, 'faq_cache', $2, $3, NOW())
       ON CONFLICT (source_url) DO UPDATE SET name=EXCLUDED.name, content=EXCLUDED.content, updated_at=NOW()`,
      [name, sourceUrl, cachedFaqAnswer]
    );
  }

  return NextResponse.json({ ok: true, qaFlag, coreIntent, semanticTags, missedOpportunities, cachedFaqAnswer });
}
