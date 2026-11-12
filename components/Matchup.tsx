"use client"

import { useEffect, useEffectEvent, useId, useRef, useState } from "react"
import { supabase } from '@/lib/supabase/client'
import type { Spot } from "@/lib/types"
import SpotPhoto from "@/components/SpotPhoto"

export default function Matchup({
  matchupId,
  a,
  b,
  onDone,
}: {
  matchupId: string
  a: Spot
  b: Spot
  onDone: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [picked, setPicked] = useState<Spot | null>(null)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const confirmId = useId()
  const lockRef = useRef(false)

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
    }
  }, [])

  const vote = useEffectEvent(async (winner: Spot) => {
    if (lockRef.current) return
    lockRef.current = true
    setBusy(true)
    setError(null)
    setPicked(winner)

    const { error: voteError } = await supabase.rpc("cast_vote", {
      p_matchup: matchupId,
      p_winner: winner.id,
    })

    if (voteError && voteError.code !== "23505") {
      lockRef.current = false
      setPicked(null)
      setBusy(false)
      setError(
        voteError.message.toLowerCase().includes("network") ||
          voteError.message.toLowerCase().includes("fetch")
          ? "Vote did not send. Check your connection and try again."
          : "Vote did not save. Tap the spot again to retry."
      )
      return
    }

    advanceTimer.current = setTimeout(() => {
      onDone()
    }, 900)
  })

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (lockRef.current) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        void vote(a)
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        void vote(b)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [a, b, vote])

  return (
    <div
      className="relative space-y-4"
      style={{ animation: "matchup-in 220ms ease-out" }}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        <SpotChoice
          spot={a}
          side="left"
          disabled={busy}
          selected={picked?.id === a.id}
          dimmed={!!picked && picked.id !== a.id}
          onVote={() => void vote(a)}
        />
        <SpotChoice
          spot={b}
          side="right"
          disabled={busy}
          selected={picked?.id === b.id}
          dimmed={!!picked && picked.id !== b.id}
          onVote={() => void vote(b)}
        />
      </div>

      <p
        id={confirmId}
        className="min-h-6 text-center text-sm font-medium text-accent"
        aria-live="polite"
        style={picked ? { animation: "confirm-in 200ms ease-out" } : undefined}
      >
        {picked ? `You picked ${picked.name}` : "\u00a0"}
      </p>

      {error ? (
        <p className="text-center text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <p className="hidden text-center text-sm text-muted md:block">
        Press{" "}
        <kbd className="rounded-[var(--radius-sm)] border border-line bg-surface px-1.5 py-0.5 tabular">
          ←
        </kbd>{" "}
        for {a.name},{" "}
        <kbd className="rounded-[var(--radius-sm)] border border-line bg-surface px-1.5 py-0.5 tabular">
          →
        </kbd>{" "}
        for {b.name}
      </p>
    </div>
  )
}

function SpotChoice({
  spot,
  side,
  disabled,
  selected,
  dimmed,
  onVote,
}: {
  spot: Spot
  side: "left" | "right"
  disabled: boolean
  selected: boolean
  dimmed: boolean
  onVote: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onVote}
      aria-label={`Vote for ${spot.name}`}
      className="group relative min-h-11 overflow-hidden rounded-[var(--radius-lg)] border border-line text-left disabled:cursor-wait"
      style={{
        opacity: dimmed ? 0.45 : 1,
        borderColor: selected ? "var(--accent)" : undefined,
        boxShadow: selected ? "var(--shadow-lift)" : undefined,
      }}
    >
      <div className="relative aspect-[4/5] w-full sm:aspect-[5/6]">
        <div className="absolute inset-0">
          <SpotPhoto
            name={spot.name}
            photoUrl={spot.photo_url}
            size="hero"
            priority={side === "left"}
            className="rounded-none"
          />
        </div>
        <div
          className="absolute inset-0"
          style={{ background: "var(--photo-veil)" }}
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 space-y-1 p-4 text-white sm:p-5">
          <p className="text-xl font-semibold leading-tight sm:text-2xl">
            {spot.name}
          </p>
          {spot.area ? (
            <p className="text-sm text-white/80">{spot.area}</p>
          ) : null}
        </div>
      </div>
    </button>
  )
}
