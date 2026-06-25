import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendMagicLink(toEmail: string, name: string, token: string): Promise<void> {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const link = `${base}/portal?token=${token}`;

  await resend.emails.send({
    from:    process.env.RESEND_FROM_EMAIL ?? "CRS Partner Portal <portal@cyberretaliator.com>",
    to:      toEmail,
    subject: "Your CRS Partner Portal Login Link",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#111">CRS Partner Portal</h2>
        <p>Hi ${name},</p>
        <p>Click the button below to log in. This link expires in <strong>15 minutes</strong>.</p>
        <a href="${link}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
          Access Partner Portal
        </a>
        <p style="color:#6b7280;font-size:13px">If you didn't request this, you can ignore it.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:12px">Cyber Retaliator Solutions — Confidential Partner Access</p>
      </div>
    `,
  });
}
