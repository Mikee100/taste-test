import type { Metadata } from "next"
import Link from "next/link"
import VoteFlow from "@/components/VoteFlow"

export const metadata: Metadata = {
  title: "Vote",
  description: "Pick the better spot in each head-to-head matchup.",
}

export default function VotePage() {
  return (
    <main className="mx-auto w-full max-w-[var(--max-wide)] flex-1 px-[var(--space-page)] py-6 sm:py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <Link
            href="/"
            className="text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            Taste Test
          </Link>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Which is better?
          </h1>
        </div>
        <Link
          href="/"
          className="shrink-0 text-sm text-muted underline-offset-4 hover:underline"
        >
          See the leaderboard
        </Link>
      </div>

      <VoteFlow />
    </main>
  )
}
