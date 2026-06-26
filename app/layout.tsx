import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://partners.cyberretaliator.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default:  "CRS Partner Portal | Cyber Retaliator Solutions",
    template: "%s | CRS Partner Portal",
  },
  description:
    "Secure partner portal for Cyber Retaliator Solutions. Access tier-restricted resources, product documentation, and support — for authorised partners only.",
  keywords: ["Cyber Retaliator Solutions", "CRS", "partner portal", "cybersecurity", "partner resources"],
  authors: [{ name: "Cyber Retaliator Solutions", url: BASE_URL }],

  // Canonical + robots defaults (per-page can override)
  alternates:  { canonical: "/" },
  robots: { index: false, follow: false }, // default: nothing indexed unless page opts in

  openGraph: {
    type:        "website",
    locale:      "en_ZA",
    url:         BASE_URL,
    siteName:    "CRS Partner Portal",
    title:       "CRS Partner Portal | Cyber Retaliator Solutions",
    description: "Secure access for authorised Cyber Retaliator Solutions partners.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "CRS Partner Portal" }],
  },

  twitter: {
    card:        "summary_large_image",
    title:       "CRS Partner Portal",
    description: "Secure access for authorised Cyber Retaliator Solutions partners.",
    images:      ["/opengraph-image"],
  },

  icons: {
    icon:  "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
