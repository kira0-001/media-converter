import type { Metadata } from "next"
import { Outfit } from "next/font/google"
import { Providers } from "./providers"
import "./globals.css"

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700", "800", "900"],
})

export const metadata: Metadata = {
  title: "Media Converter — Free Browser-Based FFmpeg",
  description:
    "Convert video and audio files instantly in your browser. MP4, WebM, MKV, MP3, AAC, WAV and more — powered by FFmpeg WebAssembly. No upload, no server, 100% private and free.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className={`${outfit.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
