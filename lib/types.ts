export type Spot = {
  id: string
  name: string
  area: string | null
  category?: string | null
  photo_url?: string | null
  elo?: number
  votes_count?: number
}

export type LeaderboardSpot = {
  id: string
  name: string
  area: string | null
  photo_url: string | null
  elo: number
  votes_count: number
}

export type MatchupView = {
  id: string
  a: Spot
  b: Spot
}

export type LiveStatus = "connected" | "reconnecting" | "idle"
