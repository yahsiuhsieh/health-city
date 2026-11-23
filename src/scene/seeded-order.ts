export function seededOrder<T>(options: readonly T[], seed: number): T[] {
  const order = [...options];
  let state = seed >>> 0;
  for (let index = order.length - 1; index > 0; index--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swap = Math.floor((state / 2 ** 32) * (index + 1));
    [order[index], order[swap]] = [order[swap]!, order[index]!];
  }
  return order;
}

export function dailyModelOrder<T>(options: readonly T[], district: string, date: string) {
  let hash = 2166136261;
  for (const character of district + "/" + date) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  }
  return seededOrder(options, hash);
}
