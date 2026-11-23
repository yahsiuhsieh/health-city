export type InspectionTable = { title: string; columns: string[]; rows: (string | number | null)[][] };
export type InspectionData = { count: number; tables: InspectionTable[]; notes: string[] };

export function mergeInspectionPages(key: string, current: InspectionData, incoming: InspectionData): InspectionData {
  const rename = (value: string) => value.replace(/^(Sleep|Exercise) (\d+)/, (_, label, index) => `${label} ${Number(index) + current.count}`);
  const tables = current.tables.map((table) => ({ ...table, rows: table.rows.map((row) => [...row]) }));
  for (const source of incoming.tables) {
    const title = key === "sleep" || key === "exercise" ? rename(source.title) : source.title;
    const rows = source.rows.map((row) => row.map((cell, index) => index === 0 && typeof cell === "string" ? rename(cell) : cell));
    const target = tables.find((table) => table.title === title);
    if (target) {
      if (JSON.stringify(target.columns) !== JSON.stringify(source.columns)) throw new Error("Continuation columns do not match.");
      if (key === "heart-rate") {
        const starts = new Set(target.rows.map(row => row[0]));
        for (const row of rows) {
          if (starts.has(row[0])) throw new Error("Duplicate heart rate interval. The batch stopped.");
          starts.add(row[0]);
        }
      }
      target.rows.push(...rows);
      if (key === "heart-rate") target.rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    } else tables.push({ ...source, title, rows });
  }
  return { ...current, count: current.count + incoming.count, tables };
}
