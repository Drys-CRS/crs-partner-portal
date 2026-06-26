import type { Metadata } from "next";
import type { ReactNode } from "react";

// Login is the only public-facing page — opt it IN to indexing
export const metadata: Metadata = {
  title: "Partner Login",
  description:
    "Sign in to the Cyber Retaliator Solutions partner portal. Enter your registered email to receive a secure, one-time login link.",
  alternates: { canonical: "/login" },
  robots: { index: true, follow: false },
  openGraph: {
    title:       "Partner Login | CRS Partner Portal",
    description: "Authorised partner access for Cyber Retaliator Solutions. Enter your email to receive a secure login link.",
    url:         "/login",
  },
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
