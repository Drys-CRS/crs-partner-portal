import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM = process.env.RESEND_FROM_EMAIL ?? "CRS Partner Portal <portal@cyberretaliator.com>";

export async function sendMagicLink(toEmail: string, name: string, token: string): Promise<void> {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const link = `${base}/portal?token=${token}`;

  await resend.emails.send({
    from: FROM,
    to: toEmail,
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

export async function sendApplicationConfirmation(toEmail: string, name: string): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: "We received your CRS Partner Portal application",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#111">CRS Partner Portal</h2>
        <p>Hi ${name},</p>
        <p>Thank you for applying to become a CRS Partner. We've received your application and our team will review it shortly.</p>
        <p>Once approved, you'll receive a login link to access the portal.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:12px">Cyber Retaliator Solutions — Confidential Partner Access</p>
      </div>
    `,
  });
}

export async function sendAdminApplicationNotification(
  name: string,
  email: string,
  company: string,
  phone: string,
  message: string,
): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL ?? "portal@cyberretaliator.com";
  const boardUrl = "https://cyberretaliatorsolutions-crs.monday.com/boards/18419462512";

  await resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `New partner application: ${name} (${company})`,
    html: `
      <div style="font-family:sans-serif;max-width:540px;margin:0 auto">
        <h2 style="color:#111">New Partner Application</h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px 0;color:#6b7280;width:100px">Name</td><td style="padding:8px 0;font-weight:600">${name}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Email</td><td style="padding:8px 0">${email}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Company</td><td style="padding:8px 0">${company}</td></tr>
          ${phone ? `<tr><td style="padding:8px 0;color:#6b7280">Phone</td><td style="padding:8px 0">${phone}</td></tr>` : ""}
          ${message ? `<tr><td style="padding:8px 0;color:#6b7280;vertical-align:top">Message</td><td style="padding:8px 0">${message}</td></tr>` : ""}
        </table>
        <a href="${boardUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
          Review in Monday.com
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          To approve: add this partner to the Partners board with their tier (Gold/Silver/Bronze).<br/>
          Then update the application Status to Approved.
        </p>
      </div>
    `,
  });
}
