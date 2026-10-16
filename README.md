# ⚡ Media Converter

> Convert video and audio files **entirely in your browser** — powered by FFmpeg WebAssembly. No upload, no server, 100% private and completely free.

[![Next.js](https://img.shields.io/badge/Next.js-14.x-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-WASM-green?logo=ffmpeg)](https://ffmpegwasm.netlify.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🔗 Live Demo

**[▶ Try it now → media-converter.vercel.app](https://media-converter.vercel.app)**

No sign-up. No upload limits. Works entirely in your browser. 🔒

---

## ✨ Features

| Feature | Details |
|---|---|
| 🎬 **14 Output Formats** | Video: MP4, WebM, MKV, MOV, AVI, TS, FLV · Audio: MP3, AAC, WAV, OGG, FLAC, M4A, Opus |
| 🎛️ **17 Codecs** | H.264, H.265/HEVC, VP9, VP8, ProRes, AAC, MP3, Opus, FLAC, PCM 16/24-bit, Dolby AC3/EAC3 |
| 🔀 **Dual Output** | Convert to video format AND extract audio track simultaneously |
| 🎙️ **Dialogue Boost** | FFmpeg EQ filter chain to boost speech, reduce background sounds — sounds natural |
| 🔊 **Volume Boost** | 0.5× to 3.0× volume amplification slider |
| 📊 **Audio Normalization** | Broadcast-standard loudnorm (EBU R128) |
| 📁 **Batch Convert** | Add multiple files, convert all in one click |
| 🖱️ **Drag & Drop** | Animated drop zone with visual feedback |
| 🌓 **Dark / Light Mode** | Persistent theme with beautiful dark UI |
| 📱 **Mobile Responsive** | Works on all screen sizes |
| 🔒 **100% Private** | Files never leave your device — no server involved |

---

## 🎙️ Audio Enhancement — How It Works

Three presets powered by FFmpeg audio filter chains:

### 📊 Normalize
```
loudnorm=I=-16:LRA=11:TP=-1.5
```
Brings all audio to EBU R128 broadcast standard (-16 LUFS). Consistent volume, no clipping.

### 🎙️ Dialogue Boost (Natural)
```
highpass=f=80 → eq f=200 g=-3 → eq f=1000 g=+2 → eq f=3500 g=+5 → dynaudnorm → loudnorm
```
- Removes deep rumble (fans, AC) below 80Hz
- Cuts muddy low-mids at 200Hz (where background music lives)
- Boosts speech fundamentals at 1kHz
- Boosts speech **presence/clarity** at 3.5kHz (the most important for intelligibility)
- Dynamic normalization raises quiet speech, tames loud peaks
- Final loudness normalization

### 🔊 Strong Enhance
Same chain but deeper cuts (-6dB at 150Hz, -3dB at 400Hz) and stronger presence boost (+7dB at 4kHz). For very noisy recordings.

---

## 🛠️ Tech Stack

- **[Next.js 14](https://nextjs.org)** — App Router, dynamic imports with `ssr: false`
- **[React 18](https://react.dev)** — Client-only rendering for FFmpeg components
- **[TypeScript 5](https://www.typescriptlang.org)** — Full type safety
- **[Tailwind CSS v3](https://tailwindcss.com)** — Utility-first styling
- **[@ffmpeg/ffmpeg](https://github.com/ffmpegwasm/ffmpeg.wasm)** — FFmpeg compiled to WebAssembly
- **[next-themes](https://github.com/pacocoursey/next-themes)** — Dark/light mode
- **[Lucide React](https://lucide.dev)** — Icons

---

## ⚙️ How FFmpeg WASM Works in the Browser

FFmpeg WASM requires `SharedArrayBuffer`, which modern browsers only enable when the page is served with these security headers:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

These are configured in [`next.config.mjs`](./next.config.mjs) and are automatically applied on Vercel/Netlify.

```js
async headers() {
  return [{
    source: "/(.*)",
    headers: [
      { key: "Cross-Origin-Opener-Policy",  value: "same-origin" },
      { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
    ]
  }]
}
```

> **Use Chrome or Edge** — Firefox sometimes blocks SharedArrayBuffer on certain sites.

---

## 🖥️ Local Development

```bash
# Clone
git clone https://github.com/kira0-001/media-converter.git
cd media-converter

# Install (legacy peer deps for React 18 compatibility)
npm install --legacy-peer-deps

# Run dev server
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**

---

## 🚀 Deploy Your Own (Free)

### Option 1 — Vercel (Recommended for Next.js)
1. Fork this repo
2. Go to **[vercel.com/new](https://vercel.com/new)**
3. Import your fork — click **Deploy**
4. Done in ~60 seconds! Headers are auto-applied from `next.config.mjs`

### Option 2 — Netlify
1. Fork this repo
2. Go to **[app.netlify.com](https://app.netlify.com)**
3. "Add new site" → "Import from Git"
4. Build command: `npm run build` · Publish dir: `.next`
5. Add a `netlify.toml` for headers (see below)

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "require-corp"
```

### Option 3 — Cloudflare Pages
- Add a `public/_headers` file:
```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
```

---

## 📁 Project Structure

```
media-converter/
├── app/
│   ├── page.tsx        # Thin wrapper — dynamic import with ssr:false
│   ├── converter.tsx   # Full MediaConverter component (browser only)
│   ├── providers.tsx   # next-themes ThemeProvider
│   ├── layout.tsx      # Root layout + metadata + fonts
│   └── globals.css     # Tailwind + dark theme CSS variables
├── public/
│   └── favicon.svg     # Custom SVG icon
├── next.config.mjs     # COOP/COEP headers + Next.js config
└── package.json
```

---

## 📄 License

MIT © [kira0-001](https://github.com/kira0-001)

---

<p align="center">Built with ❤️ — Your files never leave your device 🔒</p>
