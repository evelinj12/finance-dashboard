function csvCell(value: unknown) {
  const rawText = String(value ?? "");
  const text =
    typeof value === "string" && /^[\s\p{Cc}]*[=+\-@]/u.test(rawText)
      ? `'${rawText}`
      : rawText;

  return `"${text.replaceAll('"', '""')}"`;
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ];

  return `${lines.join("\n")}\n`;
}
