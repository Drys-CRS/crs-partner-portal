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
};

export type ContentItem = {
  id: string;
  title: string;
  group: string;
  description: string;
  content: string;
  documentUrl?: string;
  documentName?: string;
};

type BoardItem = {
  id: string;
  name: string;
  column_values: { id: string; text: string; value: string }[];
  assets?: { id: string; public_url: string; name: string }[];
};

// Asserts env var is set — undefined silently drops from JSON.stringify, causing Monday.com to
// report "invalid type for variable" instead of a clear missing-variable error.
const env = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
};

function colValue(item: BoardItem, id: string): string {
  return item.column_values.find((c) => c.id === id)?.text ?? "";
}

function colJson<T>(item: BoardItem, id: string): T | null {
  const raw = item.column_values.find((c) => c.id === id)?.value;
  if (!raw || raw === "null") return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

// ── Partners ──────────────────────────────────────────────────────────────────
// Column IDs on board 18419459733:
//   email_mm4pmxvq  → Email
//   color_mm4pv7j2  → Tier  (labels must be set to Gold / Silver / Bronze in Monday.com)

export async function findPartnerByEmail(email: string): Promise<Partner | null> {
  const data = await gql<{ boards: { items_page: { items: BoardItem[] } }[] }>(
    `query ($boardId: ID!) {
       boards(ids: [$boardId]) {
         items_page(limit: 100) {
           items { id name column_values { id text value } }
         }
       }
     }`,
    { boardId: env("MONDAY_PARTNERS_BOARD_ID") },
  );

  const needle = email.toLowerCase().trim();
  const items = data.boards[0]?.items_page?.items ?? [];

  const item = items.find(
    (i) => colValue(i, "email_mm4pmxvq").toLowerCase() === needle,
  );
  if (!item) return null;

  return {
    id: item.id,
    name: item.name,
    email: colValue(item, "email_mm4pmxvq"),
  };
}

// ── Content ───────────────────────────────────────────────────────────────────
// Column IDs on board 18419459740:
//   link_mm4pae59     → Content URL  (for link-type items)
//   file_mm4p4had     → Document     (uploaded files)
//   long_text_mm4px22x → Description (shown in portal card)

export async function getContent(): Promise<ContentItem[]> {
  const data = await gql<{
    boards: { groups: { title: string; items_page: { items: BoardItem[] } }[] }[];
  }>(
    `query ($boardId: ID!) {
       boards(ids: [$boardId]) {
         groups {
           title
           items_page(limit: 100) {
             items {
               id
               name
               column_values { id text value }
               assets { id public_url name }
             }
           }
         }
       }
     }`,
    { boardId: env("MONDAY_CONTENT_BOARD_ID") },
  );

  type FileCol = { files?: { name: string; url: string; urlPrivate?: string }[] };
  const results: ContentItem[] = [];

  for (const group of data.boards[0]?.groups ?? []) {
    for (const item of group.items_page?.items ?? []) {
      // Assets query is the most reliable source for uploaded files
      const firstAsset = item.assets?.[0];

      // Fall back to parsing the file column value JSON
      const fileCol = colJson<FileCol>(item, "file_mm4p4had");
      const firstFile = fileCol?.files?.[0];

      // Use asset public_url first, then S3 url from column value
      const documentUrl = firstAsset?.public_url || firstFile?.url || undefined;
      const documentName = firstAsset?.name || firstFile?.name || undefined;

      // Parse link column
      const linkRaw = item.column_values.find((c) => c.id === "link_mm4pae59")?.value;
      let linkUrl = "";
      if (linkRaw && linkRaw !== "null") {
        try { linkUrl = (JSON.parse(linkRaw) as { url?: string }).url ?? ""; } catch { /**/ }
      }

      results.push({
        id: item.id,
        title: item.name,
        group: group.title,
        description: colValue(item, "long_text_mm4px22x"),
        content: linkUrl,
        documentUrl,
        documentName,
      });
    }
  }

  return results;
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
    { boardId: env("MONDAY_SUBMISSIONS_BOARD_ID"), name, colVals },
  );

  return data.create_item.id;
}

// ── Applications ──────────────────────────────────────────────────────────────
// Column IDs on board 18419462512:
//   email_mm4pd170      → Email
//   text_mm4pgqnt       → Company
//   phone_mm4pyj2h      → Phone
//   long_text_mm4px2e4  → Message
//   color_mm4p6kfw      → Status         (labels: 0=Pending Review, 1=Approved, 2=Rejected)
//   date_mm4pdwxh       → Applied At
//   color_mm4p7yr8      → Assigned Tier  (labels: Bronze / Silver / Gold)

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
    { boardId: env("MONDAY_APPLICATIONS_BOARD_ID"), name, colVals },
  );

  return data.create_item.id;
}

export async function createPartnerFromApplication(itemId: string): Promise<string | null> {
  const { items } = await gql<{ items: BoardItem[] }>(
    `query ($ids: [ID!]!) { items(ids: $ids) { id name column_values { id text value } } }`,
    { ids: [itemId] },
  );

  const item = items[0];
  if (!item) return null;

  const email = colValue(item, "email_mm4pd170");
  if (!email) return null;

  const existing = await findPartnerByEmail(email);
  if (existing) return existing.id;

  const colVals = JSON.stringify({
    email_mm4pmxvq: { email, text: email },
  });

  const { create_item } = await gql<{ create_item: { id: string } }>(
    `mutation ($boardId: ID!, $name: String!, $colVals: JSON!) {
       create_item(board_id: $boardId, item_name: $name, column_values: $colVals) { id }
     }`,
    { boardId: env("MONDAY_PARTNERS_BOARD_ID"), name: item.name, colVals },
  );

  return create_item.id;
}
