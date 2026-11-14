// Keep this function self-contained: the check page also runs it in the browser.
export function mergeHeartRows(current: (string | number | null)[][], incoming: (string | number | null)[][]) {
  if (current.length !== incoming.length) throw new Error("Heart rate windows do not match.");
  return current.map((row, index) => {
    const other = incoming[index]!;
    if (row[0] !== other[0] || row[1] !== other[1]) throw new Error("Heart rate windows do not match.");
    const a = row[3] as number;
    const b = other[3] as number;
    if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || a < 0 || b < 0) throw new Error("Invalid heart rate sample count.");
    if (!a) return [...other];
    if (!b) return [...row];
    if (!(Date.parse(String(row[5])) < Date.parse(String(other[4])) || Date.parse(String(other[5])) < Date.parse(String(row[4])))) {
      throw new Error("Heart rate pages overlap. The batch stopped.");
    }
    const sum = Math.round(Number(row[2]) * a) + Math.round(Number(other[2]) * b);
    if (!Number.isSafeInteger(sum) || !Number.isSafeInteger(a + b)) throw new Error("Heart rate totals exceed numeric precision.");
    return [row[0]!, row[1]!, sum / (a + b), a + b,
      Date.parse(String(row[4])) < Date.parse(String(other[4])) ? row[4]! : other[4]!,
      Date.parse(String(row[5])) > Date.parse(String(other[5])) ? row[5]! : other[5]!];
  });
}
