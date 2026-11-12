import Image from "next/image"
import { fallbackTone, monogram } from "@/lib/score"

type Size = "thumb" | "hero"

function isValidImageUrl(value: string | null | undefined): value is string {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

export default function SpotPhoto({
  name,
  photoUrl,
  size,
  priority = false,
  className = "",
}: {
  name: string
  photoUrl: string | null | undefined
  size: Size
  priority?: boolean
  className?: string
}) {
  const radius =
    size === "thumb" ? "rounded-[var(--radius-sm)]" : "rounded-[var(--radius-lg)]"

  if (isValidImageUrl(photoUrl)) {
    if (size === "thumb") {
      return (
        <div
          className={`relative size-14 shrink-0 overflow-hidden ${radius} ${className}`}
        >
          <Image
            src={photoUrl}
            alt=""
            width={56}
            height={56}
            sizes="56px"
            className="size-full object-cover"
            priority={priority}
          />
        </div>
      )
    }

    return (
      <div className={`relative h-full w-full overflow-hidden ${radius} ${className}`}>
        <Image
          src={photoUrl}
          alt=""
          fill
          sizes="(max-width: 767px) 100vw, 50vw"
          className="object-cover"
          priority={priority}
        />
      </div>
    )
  }

  return (
    <div
      className={
        size === "thumb"
          ? `relative flex size-14 shrink-0 items-center justify-center overflow-hidden ${radius} ${className}`
          : `relative flex h-full w-full items-center justify-center overflow-hidden ${radius} ${className}`
      }
      style={{ background: fallbackTone(name) }}
      aria-hidden
    >
      <span
        className={
          size === "thumb"
            ? "text-sm font-semibold tracking-wide text-white/90"
            : "text-5xl font-semibold tracking-wide text-white/90 sm:text-6xl"
        }
      >
        {monogram(name)}
      </span>
    </div>
  )
}