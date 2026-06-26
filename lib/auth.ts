import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import pg from "pg";
import { findPartnerByEmail } from "./monday";
import { Resend } from "resend";

const resend = () => new Resend(process.env.RESEND_API_KEY!);
const FROM = () =>
  process.env.RESEND_FROM_EMAIL ??
  "CRS Partner Portal <portal@cyberretaliatorsolutions.com>";

const pool = new pg.Pool({
  host: "db.gstbkgkslqqqjfvghoxy.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

pool.on("error", (err) => console.error("[auth] pg pool error:", err.message));

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
    "https://crs-partner-portal.vercel.app",
  ],
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        console.log("[auth] sendMagicLink triggered for:", email);

        let partner;
        try {
          partner = await findPartnerByEmail(email);
        } catch (err) {
          console.error("[auth] Monday.com lookup failed:", err);
          throw err;
        }

        if (!partner) {
          console.log("[auth] No partner found for:", email);
          // Still throw so BetterAuth surfaces an error rather than silently succeeding
          throw new Error("No partner account found for this email address.");
        }

        console.log("[auth] Sending magic link to:", email);
        try {
          await resend().emails.send({
            from: FROM(),
            to: email,
            subject: "Your CRS Partner Portal Login Link",
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
                <h2 style="color:#111">CRS Partner Portal</h2>
                <p>Hi ${partner.name},</p>
                <p>Click the button below to log in. This link expires in <strong>15 minutes</strong>.</p>
                <a href="${url}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
                  Access Partner Portal
                </a>
                <p style="color:#6b7280;font-size:13px">If you didn't request this, you can ignore it.</p>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
                <p style="color:#9ca3af;font-size:12px">Cyber Retaliator Solutions — Confidential Partner Access</p>
              </div>
            `,
          });
          console.log("[auth] Email sent successfully to:", email);
        } catch (err) {
          console.error("[auth] Resend failed:", err);
          throw err;
        }
      },
      expiresIn: 60 * 15, // 15-minute magic link
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 14,  // 14 days
    updateAge: 0,                    // extend session on every visit
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  user: {
    additionalFields: {},
  },
});

export type Session = typeof auth.$Infer.Session;
