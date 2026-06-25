const MONDAY_API_URL = "https://api.monday.com/v2";

async function gql<T = Record<string, unknown>>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.MONDAY_API_KEY!,
      "API-Version": "2024-10",
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors?.length) throw new Error(data.errors[0].message);
  return data.data as T;
}

export type Partner = {
  id: string;
  name: string;
  email: string;
  tier: "Gold" | "Silver" | "Bronze";
};

export type ContentItem = {
  id: string;
  title: string;
  type: string;
  content: string;
  requiredTier: "Gold" | "Silver" | "Bronze";
};

function colValue(item: { column_values: { id: string; text: string; value: string }[] }, id: string): string {
  const col = item.column_values.find((c) => c.id === id);
  return col?.text ?? "";
}

// ── Partners ─────────────────────────────────────────────────────────────────

export async function findPartnerByEmail(email: string): Promise<Partner | null> {
  const data = await gql<{ boards: { items_page: { items: { id: string; name: string; column_values: { id: string; text: string; value: string }[] }[] } }[] }>(
    `query ($boardId: ID!, $email: CompareValue!) {
       boards(ids: [$boardId]) {
         items_page(limit: 10, query_params: {
           rules: [{ column_id: "email", compare_value: [$email] }]
         }) {
           items { id name column_values { id text value } }
         }
       }
     }`,
    {
      boardId: process.env.MONDAY_PARTNERS_BOARD_ID,
      email,
    },
  );

  const items = data.boards[0]?.items_page?.items ?? [];
  if (!items.length) return null;

  const item = items[0];
  return {
    id: item.id,
    name: item.name,
    email: colValue(item, "email"),
    tier: (colValue(item, "status") || colValue(item, "tier")) as Partner["tier"],
  };
}

// ── Content ───────────────────────────────────────────────────────────────────

const TIER_RANK: Record<string, number> = { Bronze: 1, Silver: 2, Gold: 3 };

export async function getContentForTier(userTier: string): Promise<ContentItem[]> {
  const data = await gql<{ boards: { items_page: { items: { id: string; name: string; column_values: { id: string; text: string; value: string }[] }[] } }[] }>(
    `query ($boardId: ID!) {
       boards(ids: [$boardId]) {
         items_page(limit: 100) {
           items { id name column_values { id text value } }
         }
       }
     }`,
    { boardId: process.env.MONDAY_CONTENT_BOARD_ID },
  );

  const items = data.boards[0]?.items_page?.items ?? [];
  const userRank = TIER_RANK[userTier] ?? 0;

  return items
    .map((item) => ({
      id: item.id,
      title: item.name,
      type: colValue(item, "dropdown") || colValue(item, "type"),
      content: colValue(item, "link") || colValue(item, "long_text") || colValue(item, "content"),
      requiredTier: (colValue(item, "status") || colValue(item, "required_tier")) as ContentItem["requiredTier"],
    }))
    .filter((c) => (TIER_RANK[c.requiredTier] ?? 0) <= userRank);
}

// ── Submissions ───────────────────────────────────────────────────────────────

export async function createSubmission(name: string, email: string, message: string): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const colVals = JSON.stringify({
    email:       { email, text: email },
    long_text:   message,
    date:        { date: today },
  });

  const data = await gql<{ create_item: { id: string } }>(
    `mutation ($boardId: ID!, $name: String!, $colVals: JSON!) {
       create_item(board_id: $boardId, item_name: $name, column_values: $colVals) { id }
     }`,
    {
      boardId: process.env.MONDAY_SUBMISSIONS_BOARD_ID,
      name,
      colVals,
    },
  );

  return data.create_item.id;
}
