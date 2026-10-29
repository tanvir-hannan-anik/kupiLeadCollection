/**
 * Lead form configuration.
 *
 * To change what visitors can pick under "Interested In", edit INTEREST_OPTIONS.
 * - `value` is what gets stored in the database — keep it stable once you have leads.
 * - `label` is what visitors and admins see — safe to reword any time.
 * No database migration is needed: the `interest` column is free text and the
 * API validates against this list.
 */
export const INTEREST_OPTIONS = [
  { value: "product_information", label: "Product Information" },
  { value: "service_information", label: "Service Information" },
  { value: "pricing_quotation", label: "Pricing / Quotation" },
  { value: "partnership", label: "Partnership" },
  { value: "others", label: "Others" },
] as const;

export const CONTACT_METHODS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "whatsapp", label: "WhatsApp" },
] as const;

export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Interested",
  "Converted",
  "Closed",
] as const;

/** Countries offered in the phone code picker. Bangladesh is the default. */
export const PHONE_COUNTRIES = [
  { code: "BD", dial: "+880", name: "Bangladesh" },
  { code: "IN", dial: "+91", name: "India" },
  { code: "PK", dial: "+92", name: "Pakistan" },
  { code: "NP", dial: "+977", name: "Nepal" },
  { code: "LK", dial: "+94", name: "Sri Lanka" },
  { code: "SA", dial: "+966", name: "Saudi Arabia" },
  { code: "AE", dial: "+971", name: "United Arab Emirates" },
  { code: "QA", dial: "+974", name: "Qatar" },
  { code: "KW", dial: "+965", name: "Kuwait" },
  { code: "OM", dial: "+968", name: "Oman" },
  { code: "MY", dial: "+60", name: "Malaysia" },
  { code: "SG", dial: "+65", name: "Singapore" },
  { code: "GB", dial: "+44", name: "United Kingdom" },
  { code: "US", dial: "+1", name: "United States" },
  { code: "CA", dial: "+1", name: "Canada" },
  { code: "AU", dial: "+61", name: "Australia" },
  { code: "IT", dial: "+39", name: "Italy" },
  { code: "JP", dial: "+81", name: "Japan" },
] as const;

export const DEFAULT_PHONE_COUNTRY = "BD";

/** Shown beside the checkbox and stored with each lead as consent evidence. */
export const CONSENT_TEXT =
  "I agree that Kupi may contact me about my enquiry using the details I provided.";

export type InterestValue = (typeof INTEREST_OPTIONS)[number]["value"];
export type ContactMethod = (typeof CONTACT_METHODS)[number]["value"];
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type PhoneCountry = (typeof PHONE_COUNTRIES)[number]["code"];

export function interestLabel(value: string): string {
  return INTEREST_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function contactMethodLabel(value: string | null): string {
  if (!value) return "—";
  return CONTACT_METHODS.find((o) => o.value === value)?.label ?? value;
}
