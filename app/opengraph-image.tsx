import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt     = "CRS Partner Portal";
export const size    = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f2027 100%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle grid overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(20,184,166,0.08) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        {/* Shield icon (SVG inline) */}
        <div style={{ display: "flex", marginBottom: 32 }}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
              fill="none" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 12l2 2 4-4" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Title */}
        <div style={{
          fontSize: 56, fontWeight: 800, color: "#ffffff",
          letterSpacing: "-1px", textAlign: "center", lineHeight: 1.1,
        }}>
          CRS Partner Portal
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: 26, color: "#94a3b8", marginTop: 20,
          textAlign: "center", fontWeight: 400,
        }}>
          Cyber Retaliator Solutions
        </div>

        {/* Tier pills */}
        <div style={{ display: "flex", gap: 12, marginTop: 40 }}>
          {[
            { label: "Gold",   bg: "#78350f", text: "#fde68a" },
            { label: "Silver", bg: "#1e293b", text: "#cbd5e1" },
            { label: "Bronze", bg: "#431407", text: "#fed7aa" },
          ].map(({ label, bg, text }) => (
            <div key={label} style={{
              background: bg, color: text,
              fontSize: 18, fontWeight: 700,
              padding: "8px 22px", borderRadius: 999,
              border: `1px solid ${text}40`,
            }}>
              {label}
            </div>
          ))}
        </div>

        {/* Bottom domain */}
        <div style={{
          position: "absolute", bottom: 36,
          fontSize: 18, color: "#475569",
        }}>
          partners.cyberretaliator.com
        </div>
      </div>
    ),
    { ...size },
  );
}
