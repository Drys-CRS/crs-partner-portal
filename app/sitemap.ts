import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://partners.cyberretaliator.com";
  return [
    {
      url:             `${base}/login`,
      lastModified:    new Date(),
      changeFrequency: "yearly",
      priority:        1,
    },
  ];
}
