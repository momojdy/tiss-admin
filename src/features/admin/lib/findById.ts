export function findById<T extends { id: string }>(rows: readonly T[], id: string): T | undefined {
  return rows.find((row) => row.id === id);
}
