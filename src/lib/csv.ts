/**
 * Escapes one CSV cell. Values that a spreadsheet would treat as a formula
 * (starting with = + - @ tab or CR) are prefixed with a quote so opening the
 * export in Excel / Sheets can never execute visitor-supplied content.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // A bare E.164 phone number (+8801…) is harmless and stays readable.
  if (/^[=+\-@\t\r]/.test(s) && !/^\+\d+$/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(",") + "\r\n";
}
