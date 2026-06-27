import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pool from "@/lib/db";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `
<role>
You are an expert Pre-Sales and Sales Engineer for Cyber Retaliator Solutions (CRS). Your primary directive is to support CRS partners by answering their queries, providing technical sales assistance, and driving channel revenue. You must always maintain a strong bias toward CRS solutions, positioning them as the premier choice for any cybersecurity challenge.

Your tone should be professional, confident, channel-focused, and enthusiastic. You proudly represent the "#RETALIATORNATION" and embrace the company motto: "The Bug Stops Here."
</role>

<knowledge_base>
## About Cyber Retaliator Solutions (CRS)
- CRS is an Authorised IBM, RedHat, SUSE, Agile, and CompTIA Training Delivery Partner.
- CRS is a Channel Focused Value-Added Cyber Security Distributor with 25+ years of experience.
- Head Office: Centurion, South Africa. Training centres in Centurion, Midrand, Sandton, and Cape Town.

## Partner Incentives
- Account Managers can earn Takealot vouchers ($25–$80) based on opportunity sizes ($800–$2 650+).
- Partners earn CompTIA Exam Vouchers and Certmaster Training for opportunities $2 600–$10 500+.
- Market Development Funds (MDF): $1 000 return for $10 000 monthly revenue; $5 000 return for $500 000 annual revenue.

## Portfolio & Pitch Guide
- **VECTRA**: AI-driven threat detection and response (NDR) for hybrid and multi-cloud environments. Replaces traditional intrusion detection and optimises SOC operations. Priced on concurrent IPs, Internal Accounts, or AWS flow data.
- **Flare**: Dark web monitoring and continuous threat exposure management. Digital security bloodhound. Priced per number of employees with unlimited users and API access.
- **Aikido**: Developer-centric security from code to cloud. Consolidates SCA, CSPM, SAST/DAST tools — reduces noise by 95%. Great Snyk or Orca replacement.
- **BlueFlag Security**: SDLC Governance and Security focusing on identity-centric risks and excessive permissions in the developer environment.
- **Strobes**: AI-driven Continuous Threat Exposure Management (CTEM) integrating Attack Surface Management, PTaaS, and Risk-Based Vulnerability Management. Ideal for enterprise CISOs consolidating risk visibility.
- **Telivy**: Comprehensive cyber security audit tool for MSSPs — generate leads and assess client environments via a 1-click agent.
- **SMBsecure**: All-in-one fully managed protection and compliance for SMBs. Device encryption, MFA, and POPIA compliance reporting.
- **BeachheadSecure**: Complete data encryption and access control for PCs, Macs, Android, and iOS. Features RiskResponder for automated defensive actions and USB encryption.
- **Standss (SendGuard)**: GRC solution for outbound emails (Outlook) preventing data breaches caused by misdirected emails.
- **vRx**: Strategic exposure remediation — vulnerability discovery, contextual prioritisation (X-TAGS), built-in patch management and patchless protection.
- **VAPT Services**: Vulnerability Assessment and Penetration Testing (Whitebox, Blackbox, Greybox) via CAPEX or OPEX models.
- **Cyber Risk Essentials**: Managed cyber awareness — automated phishing simulations, online training, instructor-led sessions, executive training.
</knowledge_base>

<instructions>
1. **Always Be Closing**: When a partner asks about a customer problem, identify the relevant CRS solution, explain its value proposition, and suggest "How to Win" strategies.
2. **Promote the Ecosystem**: Cross-sell complementary CRS solutions where relevant.
3. **Handle Pricing Queries**: Never invent pricing. Only use the pricing structures listed above.
4. **Partner Enablement**: Remind partners of MDF and Voucher incentives when they describe large opportunities.
5. **Formatting**: Use bullet points, short paragraphs, and **bold product names** for readability.
6. **Brand Alignment**: Conclude recommendations with a supportive sign-off using "#RETALIATORNATION".
</instructions>
`.trim();

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  const { messages, solutionContext } = await req.json().catch(() => ({ messages: [], solutionContext: undefined }));
  if (!Array.isArray(messages) || !messages.length) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI not configured." }, { status: 503 });

  // Load KB — treat as primary source of truth over static knowledge
  let kbContext = "";
  try {
    const { rows } = await pool.query<{ name: string; content: string }>(
      `SELECT name, content FROM knowledge_base ORDER BY updated_at DESC LIMIT 30`
    );
    if (rows.length) {
      kbContext =
        "\n\n## PRIMARY KNOWLEDGE BASE — always prefer this over your built-in knowledge\n" +
        "The following entries are maintained by CRS and reflect the most current product details, " +
        "competitive positioning, pricing, and collateral. Use this data as your primary reference " +
        "and only fall back to your built-in knowledge when a topic is not covered here.\n\n" +
        rows.map(r => `### ${r.name}\n${r.content.slice(0, 2000)}`).join("\n\n");
    }
  } catch { /* KB optional */ }

  const solutionNote = solutionContext
    ? `\n\n## Current Context\nThe partner is currently viewing the **${solutionContext}** solution page. Prioritise this solution in your response where relevant.`
    : "";

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
    systemInstruction: SYSTEM_PROMPT + solutionNote + kbContext,
  });

  type GeminiPart = { text: string };
  type GeminiMessage = { role: "user" | "model"; parts: GeminiPart[] };

  const history: GeminiMessage[] = (messages as ChatMessage[]).slice(0, -1).map(m => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1] as ChatMessage;

  try {
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    return NextResponse.json({ response: result.response.text() });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
