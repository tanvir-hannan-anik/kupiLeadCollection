import { describe, expect, it } from "vitest";
import { leadFormSchema, normalizePhone } from "@/lib/validation/lead";

const valid = {
  fullName: "  Rahim Uddin ",
  email: " Rahim@Example.COM ",
  phoneCountry: "BD",
  phone: "01712-345678",
  interest: "pricing_quotation",
  city: "Dhaka",
  preferredContactMethod: "whatsapp",
  message: "Need a quote",
  consent: true,
};

describe("normalizePhone", () => {
  it.each([
    ["01712345678", "BD", "+8801712345678"],
    ["01712-345678", "BD", "+8801712345678"],
    ["+880 1912 345678", "BD", "+8801912345678"],
    ["8801812345678", "BD", "+8801812345678"],
    ["+8801512345678", "US", "+8801512345678"], // explicit + overrides country picker
    ["9876543210", "IN", "+919876543210"],
    ["07911 123456", "GB", "+447911123456"],
  ])("%s (%s) -> %s", (input, country, expected) => {
    expect(normalizePhone(input, country)).toBe(expected);
  });

  it.each([
    ["12345", "BD"],
    ["0171234", "BD"],
    ["abcdefghijk", "BD"],
    ["", "BD"],
  ])("rejects %s (%s)", (input, country) => {
    expect(normalizePhone(input, country)).toBeNull();
  });
});

describe("leadFormSchema", () => {
  it("accepts a valid submission and normalises fields", () => {
    const r = leadFormSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.data?.fullName).toBe("Rahim Uddin");
    expect(r.data?.email).toBe("rahim@example.com");
  });

  it("allows optional fields to be empty", () => {
    const r = leadFormSchema.safeParse({ ...valid, city: "", preferredContactMethod: "", message: "" });
    expect(r.success).toBe(true);
  });

  it("requires consent", () => {
    const r = leadFormSchema.safeParse({ ...valid, consent: false });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["consent"]);
  });

  it.each([
    ["fullName", "A"],
    ["email", "not-an-email"],
    ["phone", "123"],
    ["interest", "free_money"],
    ["preferredContactMethod", "pigeon"],
    ["message", "x".repeat(1001)],
    ["phoneCountry", "ZZ"],
  ])("rejects invalid %s", (field, value) => {
    const r = leadFormSchema.safeParse({ ...valid, [field]: value });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === field)).toBe(true);
  });

  it("reports an invalid phone together with other field errors", () => {
    const r = leadFormSchema.safeParse({ ...valid, fullName: "A", phone: "123" });
    const fields = r.error?.issues.map((i) => i.path[0]);
    expect(fields).toContain("fullName");
    expect(fields).toContain("phone");
    expect(r.error?.issues.find((i) => i.path[0] === "phone")?.message).toMatch(/Bangladeshi/);
  });

  it("strips control and zero-width characters", () => {
    const r = leadFormSchema.safeParse({ ...valid, fullName: "Ra​him\u0000 Uddin" });
    expect(r.data?.fullName).toBe("Rahim Uddin");
  });
});
