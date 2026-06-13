// Real flips have UUID ids from the database; the seeded demo flips use
// short ids like '1'..'5'. This lets the data layer route real interactions
// to Supabase and keep the seeded flips on a local in-memory fallback.
export function isRealFlipId(id: string | undefined | null): boolean {
  return !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
