import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { z } from "zod";
import {
  CONTACT_METHODS,
  INTEREST_OPTIONS,
  PHONE_COUNTRIES,
  type ContactMethod,
  type InterestValue,
} from "@/config/lead-form";

const interestValues = INTEREST_OPTIONS.map((o) => o.value) as [
  InterestValue,
  ...InterestValue[],
];
const contactValues = CONTACT_METHODS.map((o) => o.value) as [
  ContactMethod,
  ...ContactMethod[],
];
const countryCodes = PHONE_COUNTRIES.map((c) => c.code) as [string, ...string[]];

// Strip control characters (incl. zero-width/bidi tricks) from free text.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;
const clean = (s: string) => s.replace(CONTROL_CHARS, "").trim();

/** Returns E.164 (e.g. +8801712345678) or null when the number is not valid. */
export function normalizePhone(phone: string, country: string): string | null {
  const parsed = parsePhoneNumberFromString(clean(phone), {
    defaultCountry: country as CountryCode,
  });
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

/**
 * The single source of truth for what a valid submission looks like.
 * Used by the browser (instant inline errors) and by POST /api/leads.
 */
export const leadFormSchema = z
  .object({
    fullName: z
      .string()
      .transform(clean)
      .pipe(
        z
          .string()
          .min(2, { error: "Please enter your full name." })
          .max(100, { error: "Name is too long (max 100 characters)." }),
      ),
    email: z
      .string()
      .transform((s) => clean(s).toLowerCase())
      .pipe(
        z
          .email({ error: "Please enter a valid email address." })
          .max(254, { error: "Email is too long." }),
      ),
    phoneCountry: z.enum(countryCodes, { error: "Choose a country code." }),
    phone: z
      .string()
      .transform(clean)
      .pipe(
        z
          .string()
          .min(1, { error: "Please enter your phone number." })
          .max(25, { error: "Phone number is too long." }),
      ),
    interest: z.enum(interestValues, { error: "Please choose what you're interested in." }),
    city: z
      .string()
      .transform(clean)
      .pipe(z.string().max(80, { error: "Keep this under 80 characters." })),
    preferredContactMethod: z.union([z.enum(contactValues), z.literal("")]),
    message: z
      .string()
      .transform(clean)
      .pipe(z.string().max(1000, { error: "Keep your message under 1000 characters." })),
    consent: z.boolean().refine((v) => v === true, {
      error: "Please confirm we may contact you about your enquiry.",
    }),
  })
  .refine((data) => normalizePhone(data.phone, data.phoneCountry) !== null, {
    path: ["phone"],
    error: (iss) =>
      (iss.input as { phoneCountry?: string } | undefined)?.phoneCountry === "BD"
        ? "Enter a valid Bangladeshi number, e.g. 01712-345678."
        : "Enter a valid phone number for the selected country.",
    // Check the number even while other fields are still invalid, so every
    // error shows at once — but only once phone and country parsed cleanly.
    when: (payload) =>
      !payload.issues.some((i) => i.path?.[0] === "phone" || i.path?.[0] === "phoneCountry"),
  });

export type LeadFormInput = z.input<typeof leadFormSchema>;
export type LeadFormValues = z.output<typeof leadFormSchema>;

/** Extra, non-visitor-facing fields the form sends alongside the answers. */
export const leadMetaSchema = z.object({
  // Honeypot: a hidden field that real people never fill in.
  website: z.string().max(500).optional().default(""),
  // Milliseconds since the form was rendered; bots submit instantly.
  elapsedMs: z.number().int().nonnegative().optional(),
  pagePath: z.string().max(200).optional(),
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(150).optional(),
});

export type LeadMeta = z.infer<typeof leadMetaSchema>;
