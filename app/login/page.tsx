"use client"

import { useMemo, useState, Suspense, type FormEvent } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { safeNext } from "@/lib/safe-next"

function LoginForm() {
  const searchParams = useSearchParams()
  const nextPath = useMemo(
    () => safeNext(searchParams.get("next")),
    [searchParams]
  )

  // Message from a failed link or Google round trip (/login?error=...)
  const urlError = useMemo(() => {
    const code = searchParams.get("error")
    if (code === "link_invalid") {
      return "That sign-in link has expired or was already used. Request a new one."
    }
    if (code === "oauth_failed") {
      return "Sign-in did not finish. Open the link in the same browser you requested it from, or request a new one."
    }
    return null
  }, [searchParams])

  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUrlError, setShowUrlError] = useState(true)

  const shownError = error ?? (showUrlError ? urlError : null)

  async function sendMagicLink(e?: FormEvent) {
    e?.preventDefault()
    if (!email.trim() || busy) return
    setBusy(true)
    setError(null)
    setShowUrlError(false)

    // The default Supabase email sends people to this URL with a ?code=,
    // and /auth/callback turns that code into a signed-in session.
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    })

    setBusy(false)
    if (authError) {
      setSent(false)
      setError(
        authError.message.toLowerCase().includes("rate")
          ? "Too many sign-in emails. Wait a minute, then try again."
          : "Could not send the sign-in link. Check the email address and try again."
      )
      return
    }
    setSent(true)
  }

  async function signInWithGoogle() {
    setBusy(true)
    setError(null)
    setShowUrlError(false)

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    })
    if (authError) {
      setBusy(false)
      setError(
        "Google sign-in did not start. Try again, or use the email link instead."
      )
    }
  }

  if (sent) {
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Check your email
          </h1>
          <p className="max-w-[40ch] text-muted">
            We sent a sign-in link to{" "}
            <span className="font-medium text-ink">{email.trim()}</span>. Open
            it in this browser to keep voting.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void sendMagicLink()}
            className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] bg-accent px-4 font-medium text-on-accent disabled:opacity-60"
          >
            {busy ? "Sending…" : "Resend sign-in link"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setSent(false)
              setError(null)
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-line bg-surface px-4 font-medium"
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Sign in to vote
        </h1>
        <p className="max-w-[40ch] text-muted">
          We ask you to sign in so each person gets one vote per matchup.
        </p>
      </div>

      <form onSubmit={(e) => void sendMagicLink(e)} className="space-y-3">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="min-h-12 w-full rounded-[var(--radius-md)] border border-line bg-surface px-4 text-ink placeholder:text-muted"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-md)] bg-accent px-4 font-medium text-on-accent disabled:opacity-60"
        >
          {busy ? "Sending…" : "Email me a sign-in link"}
        </button>
      </form>

      {shownError ? (
        <p className="text-sm text-danger" role="alert">
          {shownError}
        </p>
      ) : null}

      <p className="text-center text-sm text-muted">or</p>

      <button
        type="button"
        disabled={busy}
        onClick={() => void signInWithGoogle()}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-md)] border border-line bg-surface px-4 font-medium disabled:opacity-60"
      >
        Continue with Google
      </button>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-[var(--max-content)] flex-1 px-[var(--space-page)] py-8 sm:py-10">
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm font-medium text-accent underline-offset-4 hover:underline"
        >
          Taste Test
        </Link>
      </div>
      <Suspense
        fallback={
          <div className="space-y-4" aria-busy="true">
            <div className="h-8 w-48 rounded-[var(--radius-sm)] bg-line/60" />
            <div className="h-5 w-72 rounded-[var(--radius-sm)] bg-line/40" />
            <div className="h-12 w-full rounded-[var(--radius-md)] bg-line/50" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  )
}