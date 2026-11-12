"use client"

import { useEffect, useState, useEffectEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from '@/lib/supabase/client'
import type { MatchupView, Spot } from "@/lib/types"
import Matchup from "@/components/Matchup"
import SpotPhoto from "@/components/SpotPhoto"
import { scoreboardPoints } from "@/lib/score"
import type { LeaderboardSpot } from "@/lib/types"

type RawMatchup = {
  id: string
  a: Spot | Spot[]
  b: Spot | Spot[]
}

function unwrapSpot(value: Spot | Spot[]): Spot {
  return Array.isArray(value) ? value[0] : value
}

export default function VoteFlow() {
  const router = useRouter()
  const [current, setCurrent] = useState<MatchupView | null>(null)
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [votedCount, setVotedCount] = useState(0)
  const [standings, setStandings] = useState<LeaderboardSpot[]>([])
  const [shareNote, setShareNote] = useState<string | null>(null)

  const loadNext = useEffectEvent(async () => {
    setLoading(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      router.push(`/login?next=${encodeURIComponent("/vote")}`)
      return
    }

    const [{ data: matchups }, { data: voted }, { data: spots }] =
      await Promise.all([
        supabase
          .from("matchups")
          .select(
            `
          id,
          rounds!inner(status),
          a:spots!matchups_spot_a_fkey(id, name, area, photo_url),
          b:spots!matchups_spot_b_fkey(id, name, area, photo_url)
        `
          )
          .eq("rounds.status", "active"),
        supabase.from("votes").select("matchup_id"),
        supabase
          .from("spots")
          .select("id, name, area, photo_url, elo, votes_count")
          .order("elo", { ascending: false })
          .limit(5),
      ])

    const votedIds = new Set((voted ?? []).map((v) => v.matchup_id))
    const all = ((matchups ?? []) as unknown as RawMatchup[]).map((m) => ({
      id: m.id,
      a: unwrapSpot(m.a),
      b: unwrapSpot(m.b),
    }))
    const remaining = all.filter((m) => !votedIds.has(m.id))

    setTotal(all.length)
    setVotedCount(votedIds.size)
    setStandings((spots as LeaderboardSpot[]) ?? [])
    setCurrent(
      remaining.length
        ? remaining[Math.floor(Math.random() * remaining.length)]
        : null
    )
    setLoading(false)
  })

  useEffect(() => {
    void loadNext()
  }, [])

  async function shareStandings() {
    const url = typeof window !== "undefined" ? window.location.origin : ""
    const text = "Check the Taste Test leaderboard"
    try {
      if (navigator.share) {
        await navigator.share({ title: "Taste Test", text, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setShareNote("Link copied. Paste it anywhere to share.")
    } catch {
      setShareNote("Could not share. Copy the page link from your browser.")
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <div className="h-2 overflow-hidden rounded-[var(--radius-pill)] bg-line">
          <div className="h-full w-1/3 bg-accent/40" />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="aspect-[4/5] rounded-[var(--radius-lg)] bg-line/50" />
          <div className="aspect-[4/5] rounded-[var(--radius-lg)] bg-line/50" />
        </div>
        <p className="text-center text-sm text-muted">Loading matchups…</p>
      </div>
    )
  }

  if (!current) {
    const points = scoreboardPoints(standings)
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">
            You finished this round
          </h2>
          <p className="max-w-prose text-muted">
            Here is how the board looks now. Share it or jump back to the full
            leaderboard.
          </p>
        </div>

        {standings.length > 0 ? (
          <ol className="space-y-2">
            {standings.map((spot, index) => (
              <li
                key={spot.id}
                className="grid grid-cols-[2rem_3.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2.5"
              >
                <span className="tabular font-semibold">{index + 1}</span>
                <SpotPhoto
                  name={spot.name}
                  photoUrl={spot.photo_url}
                  size="thumb"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">{spot.name}</p>
                  {spot.area ? (
                    <p className="truncate text-sm text-muted">{spot.area}</p>
                  ) : null}
                </div>
                <p className="tabular font-semibold">
                  {points.get(spot.id) ?? 0}
                  <span className="ml-1 text-xs font-medium text-muted">
                    pts
                  </span>
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted">
            Standings will show here once spots are ranked.
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void shareStandings()}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-accent px-4 font-medium text-on-accent"
          >
            Share the leaderboard
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-line bg-surface px-4 font-medium"
          >
            See the leaderboard
          </Link>
        </div>
        {shareNote ? (
          <p className="text-sm text-muted" role="status">
            {shareNote}
          </p>
        ) : null}
      </div>
    )
  }

  const progressValue = total === 0 ? 0 : Math.min(votedCount, total)
  const progressMax = Math.max(total, 1)

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm text-muted">
          <span className="tabular">
            {progressValue} of {total} voted
          </span>
        </div>
        <progress
          className="h-2 w-full overflow-hidden rounded-[var(--radius-pill)] accent-accent [&::-webkit-progress-bar]:bg-line [&::-webkit-progress-value]:bg-accent [&::-moz-progress-bar]:bg-accent"
          value={progressValue}
          max={progressMax}
          aria-label={`${progressValue} of ${total} matchups voted`}
        />
      </div>

      <Matchup
        key={current.id}
        matchupId={current.id}
        a={current.a}
        b={current.b}
        onDone={() => void loadNext()}
      />
    </div>
  )
}
