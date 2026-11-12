import type { Metadata, Viewport } from "next"
import { Bricolage_Grotesque } from "next/font/google"
import "./globals.css"

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Taste Test",
    template: "%s · Taste Test",
  },
  description:
    "Vote head-to-head on local food spots and watch the live leaderboard move.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F1F3F6" },
    { media: "(prefers-color-scheme: dark)", color: "#101318" },
  ],
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg font-sans text-ink">
        {children}
      </body>
    </html>
  )
}
