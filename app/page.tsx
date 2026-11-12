import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { supabase } from '@/lib/supabase/client'
import Leaderboard, { LeaderboardSkeleton } from "@/components/Leaderboard"
import type { LeaderboardSpot } from "@/lib/types"

export const metadata: Metadata = {
  title: "Taste Test",
  description:
    "Vote head-to-head on local food spots and watch the live leaderboard move.",
  openGraph: {
    title: "Taste Test",
    description:
      "Vote head-to-head on local food spots and watch the live leaderboard move.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Taste Test",
    description:
      "Vote head-to-head on local food spots and watch the live leaderboard move.",
  },
}

async function ActiveRoundTheme() {
  const { data } = await supabase
    .from("rounds")
    .select("theme")
    .eq("status", "active")
    .maybeSingle()

  if (!data?.theme) {
    return (
      <p className="text-sm text-muted">
        No active round right now. You can still browse the board.
      </p>
    )
  }

  return (
    <p className="text-base text-muted">
      This round:{" "}
      <span className="font-medium text-ink">{data.theme}</span>
    </p>
  )
}

async function LiveLeaderboard() {
  const { data } = await supabase
    .from("spots")
    .select("id, name, area, photo_url, elo, votes_count")
    .order("elo", { ascending: false })

  return <Leaderboard initial={(data as LeaderboardSpot[]) ?? []} />
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-[var(--max-content)] flex-1 px-[var(--space-page)] py-8 sm:py-10">
      <header className="space-y-5">
        <div className="space-y-3">
          <h1 className="text-[length:var(--text-2xl)] font-semibold leading-[1.05] tracking-tight">
            Taste Test
          </h1>
          <p className="max-w-[36ch] text-base text-muted">
            Vote local spots head-to-head, then watch the live board move.
          </p>
        </div>

        <Link
          href="/vote"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-md)] bg-accent px-5 text-base font-medium text-on-accent sm:w-auto"
        >
          Start voting
        </Link>

        <Suspense
          fallback={
            <div className="h-5 w-48 animate-pulse rounded-[var(--radius-sm)] bg-line/60" />
          }
        >
          <ActiveRoundTheme />
        </Suspense>
      </header>

      <div className="mt-10">
        <Suspense fallback={<LeaderboardSkeleton />}>
          <LiveLeaderboard />
        </Suspense>
      </div>
    </main>
  )
}
