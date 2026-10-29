const MAIN_SITE_URL = (
  process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://kupi-dzon.onrender.com"
).replace(/\/$/, "");

export const site = {
  name: "Kupi",
  mainUrl: MAIN_SITE_URL,
  mainUrlLabel: MAIN_SITE_URL.replace(/^https?:\/\//, ""),
  privacyUrl: process.env.NEXT_PUBLIC_PRIVACY_URL ?? `${MAIN_SITE_URL}/privacy`,
} as const;
