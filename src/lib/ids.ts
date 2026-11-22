/**
 * The SQLite database uses numeric IDs. Forms and the browser send them back as text,
 * and a relationship field holds either the related ID or, when populated, the related
 * document. `toID` reads all three.
 */
export function toID(value: unknown): number | null {
  if (typeof value === 'object' && value !== null && 'id' in value) return toID(value.id)
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? value : null
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value)
  return null
}
