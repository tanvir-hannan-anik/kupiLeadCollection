const MAIN_SITE_URL = (
  process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://kupi-dzon.onrender.com"
).replace(/\/$/, "");

export const site = {
  name: "Kupi",
  mainUrl: MAIN_SITE_URL,
  mainUrlLabel: MAIN_SITE_URL.replace(/^https?:\/\//, ""),
  privacyUrl: process.env.NEXT_PUBLIC_PRIVACY_URL ?? `${MAIN_SITE_URL}/privacy`,
  /** Public contact details shown on the page and on the downloadable card. */
  contact: {
    email: "kupilearn@gmail.com",
    phone: "+8801743344119", // E.164, used for tel: links
    phoneLabel: "01743-344119",
    phoneLabelIntl: "+880 1743-344119",
  },
} as const;
