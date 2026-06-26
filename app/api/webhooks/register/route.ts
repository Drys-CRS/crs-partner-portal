import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Call this endpoint once after deployment to register the Monday.com webhook.
// GET /api/webhooks/register
export async function GET(req: NextRequest) {
  const apiKey = process.env.MONDAY_API_KEY;
  const boardId = process.env.MONDAY_APPLICATIONS_BOARD_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (!apiKey || !boardId || !baseUrl) {
    return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
  }

  const webhookUrl = `${baseUrl}/api/webhooks/monday`;

  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
      "API-Version": "2024-10",
    },
    body: JSON.stringify({
      query: `mutation ($boardId: ID!, $url: String!) {
        create_webhook(
          board_id: $boardId
          url: $url
          event: change_status_column_value
          config: "{\\"columnId\\":\\"color_mm4p6kfw\\"}"
        ) { id board_id }
      }`,
      variables: { boardId, url: webhookUrl },
    }),
  });

  const data = await res.json();
  if (data.errors?.length) {
    return NextResponse.json({ error: data.errors[0].message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, webhook: data.data?.create_webhook });
}
