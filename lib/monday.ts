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

type BoardItem = { id: string; name: string; column_values: { id: string; text: string; value: string }[] };

function colValue(item: BoardItem, id: string): string {
  return item.column_values.find((c) => c.id === id)?.text ?? "";
}

// ── Partners ──────────────────────────────────────────────────────────────────
// Column IDs on board 18419459733:
//   email_mm4pmxvq  → Email
//   color_mm4pv7j2  → Tier  (labels must be set to Gold / Silver / Bronze in Monday.com)

export async function findPartnerByEmail(email: string): Promise<Partner | null> {
  const data = await gql<{ boards: { items_page: { items: BoardItem[] } }[] }>(
    `query ($boardId: ID!, $email: CompareValue!) {
       boards(ids: [$boardId]) {
         items_page(limit: 10, query_params: {
           rules: [{ column_id: "email_mm4pmxvq", compare_value: [$email] }]
         }) {
           items { id name column_values { id text value } }
         }
       }
     }`,
    { boardId: process.env.MONDAY_PARTNERS_BOARD_ID, email },
  );

  const item = data.boards[0]?.items_page?.items?.[0];
  if (!item) return null;

  const tier = colValue(item, "color_mm4pv7j2");
  if (!["Gold", "Silver", "Bronze"].includes(tier)) return null;

  return {
    id: item.id,
    name: item.name,
    email: colValue(item, "email_mm4pmxvq"),
    tier: tier as Partner["tier"],
  };
}

// ── Content ───────────────────────────────────────────────────────────────────
// Column IDs on board 18419459740:
//   color_mm4pwep9  → Type          (labels: Document / Video / Link)
//   link_mm4pae59   → Content URL
//   color_mm4peazb  → Required Tier (labels: Gold / Silver / Bronze)

const TIER_RANK: Record<string, number> = { Bronze: 1, Silver: 2, Gold: 3 };

export async function getContentForTier(userTier: string): Promise<ContentItem[]> {
  const data = await gql<{ boards: { items_page: { items: BoardItem[] } }[] }>(
    `query ($boardId: ID!) {
       boards(ids: [$boardId]) {
         items_page(limit: 100) {
           items { id name column_values { id text value } }
         }
       }
     }`,
    { boardId: process.env.MONDAY_CONTENT_BOARD_ID },
  );

  const userRank = TIER_RANK[userTier] ?? 0;

  return (data.boards[0]?.items_page?.items ?? [])
    .map((item) => ({
      id: item.id,
      title: item.name,
      type: colValue(item, "color_mm4pwep9"),
      content: colValue(item, "link_mm4pae59"),
      requiredTier: colValue(item, "color_mm4peazb") as ContentItem["requiredTier"],
    }))
    .filter((c) => (TIER_RANK[c.requiredTier] ?? 0) <= userRank);
}

// ── Submissions ───────────────────────────────────────────────────────────────
// Column IDs on board 18419459747:
//   email_mm4phaca      → Email
//   long_text_mm4phxc8  → Message
//   date_mm4pbf2n       → Submitted At

export async function createSubmission(name: string, email: string, message: string): Promise<string> {
  const colVals = JSON.stringify({
    email_mm4phaca:     { email, text: email },
    long_text_mm4phxc8: { text: message },
    date_mm4pbf2n:      { date: new Date().toISOString().split("T")[0] },
  });

  const data = await gql<{ create_item: { id: string } }>(
    `mutation ($boardId: ID!, $name: String!, $colVals: JSON!) {
       create_item(board_id: $boardId, item_name: $name, column_values: $colVals) { id }
     }`,
    { boardId: process.env.MONDAY_SUBMISSIONS_BOARD_ID, name, colVals },
  );

  return data.create_item.id;
}

// ── Applications ──────────────────────────────────────────────────────────────
// Column IDs on board 18419462512:
//   email_mm4pd170      → Email
//   text_mm4pgqnt       → Company
//   phone_mm4pyj2h      → Phone
//   long_text_mm4px2e4  → Message
//   color_mm4p6kfw      → Status  (labels: Pending Review / Approved / Rejected)
//   date_mm4pdwxh       → Applied At

export async function createApplication(
  name: string,
  email: string,
  company: string,
  phone: string,
  message: string,
): Promise<string> {
  const colVals = JSON.stringify({
    email_mm4pd170:     { email, text: email },
    text_mm4pgqnt:      company,
    phone_mm4pyj2h:     { phone, countryShortName: "ZA" },
    long_text_mm4px2e4: { text: message },
    date_mm4pdwxh:      { date: new Date().toISOString().split("T")[0] },
  });

  const data = await gql<{ create_item: { id: string } }>(
    `mutation ($boardId: ID!, $name: String!, $colVals: JSON!) {
       create_item(board_id: $boardId, item_name: $name, column_values: $colVals) { id }
     }`,
    { boardId: process.env.MONDAY_APPLICATIONS_BOARD_ID, name, colVals },
  );

  return data.create_item.id;
}
