import type { Metadata } from "next";

// Portal is private — explicitly block all crawlers
export const portalMetadata: Metadata = {
  title:  "Partner Dashboard",
  robots: { index: false, follow: false, nocache: true },
};
