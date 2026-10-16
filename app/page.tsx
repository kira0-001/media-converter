import dynamic from "next/dynamic"

// FFmpeg WASM is browser-only — completely disable SSR for this component
const MediaConverter = dynamic(() => import("./converter"), { ssr: false })

export default function Page() {
  return <MediaConverter />
}
