import { describe, expect, it } from "vitest";
import { csvCell, csvRow } from "@/lib/csv";
import { filtersToQuery, parseLeadFilters, searchFilter } from "@/lib/leads/filters";

describe("csvCell", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell('He said "hi", then\nleft')).toBe('"He said ""hi"", then\nleft"');
  });

  it.each(["=HYPERLINK(\"x\")", "+1+cmd", "-2+3", "@SUM(A1)"])(
    "neutralises spreadsheet formula %s",
    (v) => {
      expect(csvCell(v).replace(/^"/, "").startsWith("'")).toBe(true);
    },
  );

  it("keeps E.164 phone numbers readable", () => {
    expect(csvCell("+8801712345678")).toBe("+8801712345678");
  });

  it("renders null/undefined as empty", () => {
    expect(csvRow([null, undefined, "a"])).toBe(",,a\r\n");
  });
});

describe("parseLeadFilters", () => {
  it("drops unknown statuses, interests and bad dates", () => {
    const f = parseLeadFilters({ status: "Hacked", interest: "x", from: "2026-13-45", to: "yesterday", page: "-3" });
    expect(f).toMatchObject({ status: "", interest: "", from: "", to: "", page: 1 });
  });

  it("keeps valid values", () => {
    const f = parseLeadFilters({ status: "Converted", interest: "partnership", from: "2026-10-01", to: "2026-10-29", page: "3" });
    expect(f).toMatchObject({ status: "Converted", interest: "partnership", from: "2026-10-01", to: "2026-10-29", page: 3 });
  });

  it("removes PostgREST syntax characters from search", () => {
    const f = parseLeadFilters({ q: 'a,b).or(id.eq."x"*%' });
    expect(f.q).not.toMatch(/[,()*%"]/);
  });

  it("adds a phone clause only for numeric searches", () => {
    expect(searchFilter("rahim")).not.toContain("phone");
    expect(searchFilter("01712 345")).toContain('phone.ilike."%01712345%"');
  });

  it("builds stable query strings", () => {
    const f = parseLeadFilters({ q: "rahim", status: "New", page: "2" });
    expect(filtersToQuery(f)).toBe("?q=rahim&status=New&page=2");
    expect(filtersToQuery(f, { page: 1 })).toBe("?q=rahim&status=New");
  });
});
