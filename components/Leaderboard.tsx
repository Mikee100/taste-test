"use client"

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react"
import { supabase } from '@/lib/supabase/client'
import { scoreboardPoints } from "@/lib/score"
import type { LeaderboardSpot, LiveStatus } from "@/lib/types"
import SpotPhoto from "@/components/SpotPhoto"

function prefersReducedMotion() {
  if (typeof window === "undefined") return true
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export default function Leaderboard({
  initial,
}: {
  initial: LeaderboardSpot[]
}) {
  const [spots, setSpots] = useState(initial)
  const [status, setStatus] = useState<LiveStatus>("idle")
  const [movedIds, setMovedIds] = useState<Set<string>>(new Set())
  const pending = useRef(new Map<string, LeaderboardSpot>())
  const rowRefs = useRef(new Map<string, HTMLLIElement>())
  const prevRects = useRef(new Map<string, DOMRect>())
  const clearMovedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSpots(initial)
  }, [initial])

  useEffect(() => {
    const channel = supabase
      .channel("spots-live")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "spots" },
        (payload) => {
          const s = payload.new as LeaderboardSpot
          pending.current.set(s.id, s)
        }
      )
      .subscribe((channelStatus) => {
        if (channelStatus === "SUBSCRIBED") setStatus("connected")
        else if (
          channelStatus === "CHANNEL_ERROR" ||
          channelStatus === "TIMED_OUT" ||
          channelStatus === "CLOSED"
        ) {
          setStatus("reconnecting")
        }
      })

    const timer = setInterval(() => {
      if (!pending.current.size) return

      prevRects.current = new Map()
      for (const [id, el] of rowRefs.current) {
        prevRects.current.set(id, el.getBoundingClientRect())
      }

      const updates = pending.current
      pending.current = new Map()

      setSpots((prev) => {
        const next = prev.map((s) => {
          const u = updates.get(s.id)
          return u
            ? {
                ...s,
                ...u,
                photo_url: u.photo_url ?? s.photo_url,
              }
            : s
        })
        const sorted = [...next].sort((a, b) => b.elo - a.elo)

        const oldRank = new Map(prev.map((s, i) => [s.id, i]))
        const moved = new Set<string>()
        sorted.forEach((s, i) => {
          if (oldRank.get(s.id) !== i) moved.add(s.id)
        })
        if (moved.size) {
          setMovedIds(moved)
          if (clearMovedTimer.current) clearTimeout(clearMovedTimer.current)
          clearMovedTimer.current = setTimeout(() => setMovedIds(new Set()), 900)
        }

        return sorted
      })
    }, 1000)

    return () => {
      clearInterval(timer)
      if (clearMovedTimer.current) clearTimeout(clearMovedTimer.current)
      supabase.removeChannel(channel)
    }
  }, [])

  useLayoutEffect(() => {
    if (prefersReducedMotion()) {
      prevRects.current = new Map()
      return
    }

    for (const [id, el] of rowRefs.current) {
      const prev = prevRects.current.get(id)
      if (!prev) continue
      const next = el.getBoundingClientRect()
      const dy = prev.top - next.top
      if (Math.abs(dy) < 1) continue
      el.animate(
        [{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }],
        { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      )
    }
    prevRects.current = new Map()
  }, [spots])

  const points = scoreboardPoints(spots)
  const statusLabel =
    status === "connected"
      ? "Live"
      : status === "reconnecting"
        ? "Reconnecting"
        : "Connecting"

  return (
    <section aria-labelledby="leaderboard-heading" className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 id="leaderboard-heading" className="text-lg font-semibold tracking-tight">
          Leaderboard
        </h2>
        <p
          className="flex items-center gap-2 text-sm text-muted"
          aria-live="polite"
        >
          <span
            className="inline-block size-2 rounded-[var(--radius-pill)] bg-accent"
            style={
              status === "connected"
                ? ({ animation: "pulse-live 1.6s ease-in-out infinite" } as CSSProperties)
                : status === "reconnecting"
                  ? { opacity: 0.4 }
                  : { opacity: 0.25 }
            }
            aria-hidden
          />
          <span className="tabular">{statusLabel}</span>
        </p>
      </div>

      {spots.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-line bg-surface px-4 py-6 text-sm text-muted">
          No spots on the board yet. Start voting to fill the rankings.
        </p>
      ) : (
        <ol className="space-y-2">
          {spots.map((spot, index) => {
            const moved = movedIds.has(spot.id)
            return (
              <li
                key={spot.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(spot.id, el)
                  else rowRefs.current.delete(spot.id)
                }}
                className="grid grid-cols-[2.25rem_3.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2.5"
                style={
                  moved
                    ? {
                        borderColor: "var(--accent)",
                        background: "var(--accent-soft)",
                      }
                    : undefined
                }
              >
                <span
                  className="tabular text-lg font-semibold leading-none"
                  aria-label={`Rank ${index + 1}`}
                >
                  {index + 1}
                </span>
                <SpotPhoto
                  name={spot.name}
                  photoUrl={spot.photo_url}
                  size="thumb"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium leading-tight">{spot.name}</p>
                  {spot.area ? (
                    <p className="truncate text-sm text-muted">{spot.area}</p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="tabular text-lg font-semibold leading-none">
                    {points.get(spot.id) ?? 0}
                    <span className="ml-1 text-xs font-medium text-muted">
                      pts
                    </span>
                  </p>
                  <p className="tabular text-xs text-muted">
                    {spot.votes_count}{" "}
                    {spot.votes_count === 1 ? "vote" : "votes"}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
      <div className="sr-only" aria-live="polite">
        {movedIds.size
          ? `Rankings updated for ${movedIds.size} ${movedIds.size === 1 ? "spot" : "spots"}.`
          : ""}
      </div>
    </section>
  )
}

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="flex justify-between">
        <div className="h-6 w-28 rounded-[var(--radius-sm)] bg-line/70" />
        <div className="h-5 w-16 rounded-[var(--radius-sm)] bg-line/50" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[2.25rem_3.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2.5"
        >
          <div className="h-5 w-5 rounded-[var(--radius-sm)] bg-line/60" />
          <div className="size-14 rounded-[var(--radius-sm)] bg-line/60" />
          <div className="space-y-2">
            <div className="h-4 w-28 rounded-[var(--radius-sm)] bg-line/60" />
            <div className="h-3 w-16 rounded-[var(--radius-sm)] bg-line/40" />
          </div>
          <div className="space-y-2 justify-self-end">
            <div className="ml-auto h-5 w-10 rounded-[var(--radius-sm)] bg-line/60" />
            <div className="ml-auto h-3 w-12 rounded-[var(--radius-sm)] bg-line/40" />
          </div>
        </div>
      ))}
    </div>
  )
}
