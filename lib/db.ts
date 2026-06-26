import pg from "pg";

// Shared pool for app routes (separate from BetterAuth's internal pool)
const pool = new pg.Pool({
  host: process.env.NODE_ENV === "production"
    ? "aws-0-eu-west-1.pooler.supabase.com"
    : "db.gstbkgkslqqqjfvghoxy.supabase.co",
  port: 5432,
  database: "postgres",
  user: process.env.NODE_ENV === "production"
    ? "postgres.gstbkgkslqqqjfvghoxy"
    : "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

pool.on("error", err => console.error("[db] pool error:", err.message));

export default pool;
