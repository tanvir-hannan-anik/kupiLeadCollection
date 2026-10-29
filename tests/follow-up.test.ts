import { describe, expect, it } from "vitest";
import { FOLLOW_UP_TEMPLATES } from "@/config/follow-up-templates";
import { INTEREST_OPTIONS } from "@/config/lead-form";
import { followUpHtml, renderFollowUp, templateKeyFor } from "@/lib/follow-up";

const links = { siteUrl: "https://kupi.example", signupUrl: "https://kupi.example/signup" };
const lead = {
  full_name: "Rahim Uddin",
  interest: "pricing_quotation",
  city: "Dhaka",
  message: "Need a quote\nfor 3 students",
  created_at: "2026-10-29T07:54:44Z",
};

describe("follow-up templates", () => {
  it("has a template for every interest option", () => {
    for (const o of INTEREST_OPTIONS) expect(FOLLOW_UP_TEMPLATES[o.value]).toBeDefined();
  });

  it("picks the template that matches the lead's interest, falling back to general", () => {
    expect(templateKeyFor("partnership")).toBe("partnership");
    expect(templateKeyFor("removed_option")).toBe("others");
  });

  it("fills every placeholder", () => {
    for (const key of Object.keys(FOLLOW_UP_TEMPLATES) as (keyof typeof FOLLOW_UP_TEMPLATES)[]) {
      const { subject, body } = renderFollowUp(key, lead, "admin@kupi.test", links);
      expect(subject + body).not.toMatch(/\{\{/);
      expect(body).toContain("Rahim Uddin");
      expect(body).toContain("admin@kupi.test");
    }
  });

  it("personalises name, date, city and the visitor's own message", () => {
    const { body } = renderFollowUp("pricing_quotation", lead, "Sara", links);
    expect(body).toContain("Hi Rahim Uddin,");
    expect(body).toContain("29 October 2026");
    expect(body).toContain("quotation for Dhaka");
    expect(body).toContain('You wrote: "Need a quote for 3 students"');
    expect(body).toContain("https://kupi.example/signup");
  });

  it("drops lines whose placeholders are empty and uses a friendly city fallback", () => {
    const { body } = renderFollowUp("pricing_quotation", { ...lead, message: null, city: null }, "Sara", links);
    expect(body).not.toContain("You wrote");
    expect(body).toContain("quotation for your area");
    expect(body).not.toMatch(/\n{3,}/);
  });
});

describe("followUpHtml", () => {
  it("escapes HTML the admin or visitor typed", () => {
    const html = followUpHtml('Hi <script>alert("x")</script>', links);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("turns paragraphs, line breaks and links into email HTML", () => {
    const html = followUpHtml("Line one\nline two\n\nVisit https://kupi.example/signup.", links);
    expect(html).toContain("Line one<br>line two");
    expect(html.match(/<p /g)?.length).toBe(2);
    expect(html).toContain('<a href="https://kupi.example/signup"');
  });
});
