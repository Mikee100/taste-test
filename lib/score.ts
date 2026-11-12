import type { LeaderboardSpot } from "@/lib/types"

/** Turn Elo into a 20–100 scoreboard number people can scan. */
export function scoreboardPoints(
  spots: LeaderboardSpot[]
): Map<string, number> {
  const map = new Map<string, number>()
  if (spots.length === 0) return map

  const elos = spots.map((s) => s.elo)
  const min = Math.min(...elos)
  const max = Math.max(...elos)
  const span = max - min

  for (const spot of spots) {
    if (span === 0) {
      map.set(spot.id, 50)
    } else {
      map.set(spot.id, Math.round(20 + ((spot.elo - min) / span) * 80))
    }
  }
  return map
}

export function monogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Stable soft fill from a name — cool slate/teal family only. */
export function fallbackTone(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  const hues = [168, 186, 200, 210, 152, 175]
  const hue = hues[hash % hues.length]
  const sat = 18 + (hash % 10)
  const light = 28 + (hash % 12)
  return `hsl(${hue} ${sat}% ${light}%)`
}
