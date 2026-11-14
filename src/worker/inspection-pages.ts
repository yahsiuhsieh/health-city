import type { InspectionData } from "./health-data.ts";
import { mergeHeartRows } from "./heart-pages.ts";

// The browser receives this function with mergeHeartRows as its only dependency.
export function mergeInspectionPages(key: string, current: InspectionData, incoming: InspectionData): InspectionData {
  if (key === "heart-rate") {
    return { ...current, count: current.count + incoming.count,
      tables: [{ ...current.tables[0]!, rows: mergeHeartRows(current.tables[0]!.rows, incoming.tables[0]!.rows) }] };
  }
  const rename = (value: string) => value.replace(/^(Sleep|Exercise) (\d+)/, (_, label, index) => `${label} ${Number(index) + current.count}`);
  const tables = current.tables.map((table) => ({ ...table, rows: table.rows.map((row) => [...row]) }));
  for (const source of incoming.tables) {
    const title = key === "sleep" || key === "exercise" ? rename(source.title) : source.title;
    const rows = source.rows.map((row) => row.map((cell, index) => index === 0 && typeof cell === "string" ? rename(cell) : cell));
    const target = tables.find((table) => table.title === title);
    if (target) {
      if (JSON.stringify(target.columns) !== JSON.stringify(source.columns)) throw new Error("Continuation columns do not match.");
      target.rows.push(...rows);
    } else tables.push({ ...source, title, rows });
  }
  return { ...current, count: current.count + incoming.count, tables };
}
