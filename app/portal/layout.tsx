import type { ReactNode } from "react";

// Auth + magic-link exchange is handled by middleware.ts
export default function PortalLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
