"use client"

import { useState, useRef, useCallback, useEffect, DragEvent } from "react"
import {
  Upload, Download, Trash2, Film, Music, Sun, Moon,
  Loader2, CheckCircle2, AlertCircle, Zap, FileVideo,
  FileAudio, DownloadCloud, RefreshCw, ChevronDown, ChevronUp,
  Volume2, Mic, Settings2, Layers,
} from "lucide-react"
import { useTheme } from "next-themes"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"

/* ─── Types ─────────────────────────────────────────────────────────────── */
type FileStatus = "idle" | "converting" | "done" | "error"
type Enhancement = "none" | "normalize" | "dialogue" | "strong"

interface MediaFile {
  id: string
  file: File
  name: string
  size: string
  kind: "video" | "audio"
  status: FileStatus
  progress: number
  convertedBlob?: Blob
  audioBlob?: Blob
  error?: string
}

/* ─── Format definitions ─────────────────────────────────────────────────── */
const VIDEO_FORMATS = ["mp4", "webm", "mkv", "mov", "avi", "ts", "flv"] as const
const AUDIO_FORMATS = ["mp3", "aac", "wav", "ogg", "flac", "m4a", "opus"] as const
const ALL_FORMATS   = [...VIDEO_FORMATS, ...AUDIO_FORMATS] as const
type Format = typeof ALL_FORMATS[number]

const FORMAT_COLOR: Record<Format, string> = {
  mp4:  "bg-blue-500/15 border-blue-500/50 text-blue-700 dark:text-blue-300",
  webm: "bg-indigo-500/15 border-indigo-500/50 text-indigo-700 dark:text-indigo-300",
  mkv:  "bg-cyan-500/15 border-cyan-500/50 text-cyan-700 dark:text-cyan-300",
  mov:  "bg-sky-500/15 border-sky-500/50 text-sky-700 dark:text-sky-300",
  avi:  "bg-violet-500/15 border-violet-500/50 text-violet-700 dark:text-violet-300",
  ts:   "bg-teal-500/15 border-teal-500/50 text-teal-700 dark:text-teal-300",
  flv:  "bg-orange-500/15 border-orange-500/50 text-orange-700 dark:text-orange-300",
  mp3:  "bg-rose-500/15 border-rose-500/50 text-rose-700 dark:text-rose-300",
  aac:  "bg-pink-500/15 border-pink-500/50 text-pink-700 dark:text-pink-300",
  wav:  "bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300",
  ogg:  "bg-lime-500/15 border-lime-500/50 text-lime-700 dark:text-lime-300",
  flac: "bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300",
  m4a:  "bg-purple-500/15 border-purple-500/50 text-purple-700 dark:text-purple-300",
  opus: "bg-fuchsia-500/15 border-fuchsia-500/50 text-fuchsia-700 dark:text-fuchsia-300",
}

const ACTIVE_FORMAT: Record<Format, string> = {
  mp4:  "bg-blue-500 border-blue-600 text-white shadow-[0_0_14px_rgba(59,130,246,0.5)]",
  webm: "bg-indigo-500 border-indigo-600 text-white shadow-[0_0_14px_rgba(99,102,241,0.5)]",
  mkv:  "bg-cyan-500 border-cyan-600 text-white shadow-[0_0_14px_rgba(6,182,212,0.5)]",
  mov:  "bg-sky-500 border-sky-600 text-white shadow-[0_0_14px_rgba(14,165,233,0.5)]",
  avi:  "bg-violet-500 border-violet-600 text-white shadow-[0_0_14px_rgba(139,92,246,0.5)]",
  ts:   "bg-teal-500 border-teal-600 text-white shadow-[0_0_14px_rgba(20,184,166,0.5)]",
  flv:  "bg-orange-500 border-orange-600 text-white shadow-[0_0_14px_rgba(249,115,22,0.5)]",
  mp3:  "bg-rose-500 border-rose-600 text-white shadow-[0_0_14px_rgba(244,63,94,0.5)]",
  aac:  "bg-pink-500 border-pink-600 text-white shadow-[0_0_14px_rgba(236,72,153,0.5)]",
  wav:  "bg-amber-500 border-amber-600 text-white shadow-[0_0_14px_rgba(245,158,11,0.5)]",
  ogg:  "bg-lime-500 border-lime-600 text-white shadow-[0_0_14px_rgba(132,204,22,0.5)]",
  flac: "bg-emerald-500 border-emerald-600 text-white shadow-[0_0_14px_rgba(16,185,129,0.5)]",
  m4a:  "bg-purple-500 border-purple-600 text-white shadow-[0_0_14px_rgba(168,85,247,0.5)]",
  opus: "bg-fuchsia-500 border-fuchsia-600 text-white shadow-[0_0_14px_rgba(217,70,239,0.5)]",
}

/* ─── Codec options ─────────────────────────────────────────────────────── */
const VIDEO_CODECS = [
  { value: "copy",        label: "copy (no re-encode, fastest)" },
  { value: "libx264",     label: "H.264 / libx264 (universal)" },
  { value: "libx265",     label: "H.265 / HEVC (smaller size)" },
  { value: "libvpx-vp9",  label: "VP9 (open source, WebM)" },
  { value: "libvpx",      label: "VP8 (older WebM)" },
  { value: "mpeg4",       label: "MPEG-4 (legacy)" },
  { value: "prores",      label: "ProRes (high quality)" },
]

const AUDIO_CODECS = [
  { value: "copy",        label: "copy (no re-encode, fastest)" },
  { value: "aac",         label: "AAC (default, great quality)" },
  { value: "libmp3lame",  label: "MP3 / libmp3lame" },
  { value: "libopus",     label: "Opus (best compression)" },
  { value: "libvorbis",   label: "Vorbis (OGG)" },
  { value: "flac",        label: "FLAC (lossless)" },
  { value: "pcm_s16le",   label: "PCM 16-bit (WAV uncompressed)" },
  { value: "pcm_s24le",   label: "PCM 24-bit (studio quality)" },
  { value: "eac3",        label: "Dolby Digital+ (EAC3)" },
  { value: "ac3",         label: "Dolby Digital AC3" },
]

/* ─── Audio enhancement filter chains ───────────────────────────────────── */
const ENHANCEMENT_FILTERS: Record<Enhancement, string | null> = {
  none:      null,
  normalize: "loudnorm=I=-16:LRA=11:TP=-1.5",
  dialogue: [
    "highpass=f=80",
    "equalizer=f=200:t=o:w=1:g=-3",
    "equalizer=f=1000:t=o:w=2:g=2",
    "equalizer=f=3500:t=o:w=1:g=5",
    "dynaudnorm=g=5:s=12:b=0",
    "loudnorm=I=-16:LRA=11:TP=-1.5",
  ].join(","),
  strong: [
    "highpass=f=100",
    "lowpass=f=10000",
    "equalizer=f=150:t=o:w=1.5:g=-6",
    "equalizer=f=400:t=o:w=1:g=-3",
    "equalizer=f=1500:t=o:w=2:g=3",
    "equalizer=f=4000:t=o:w=1:g=7",
    "dynaudnorm=g=8:s=8:b=0",
    "loudnorm=I=-14:LRA=7:TP=-2",
  ].join(","),
}

const ENHANCEMENT_INFO: Record<Enhancement, { label: string; desc: string; icon: string }> = {
  none:      { label: "None",           desc: "No audio processing",                                           icon: "–"  },
  normalize: { label: "Normalize",      desc: "Level out volume to a standard broadcast loudness",             icon: "📊" },
  dialogue:  { label: "Dialogue Boost", desc: "Reduce background, boost speech clarity (natural)",             icon: "🎙️" },
  strong:    { label: "Strong Enhance", desc: "Aggressive background cut + maximum speech amplification",      icon: "🔊" },
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function fmtSize(bytes: number) {
  if (!bytes) return "0 B"
  const k = 1024, s = ["B","KB","MB","GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(1)} ${s[i]}`
}
function uid() { return Math.random().toString(36).slice(2, 9) }
const isAudioFmt = (f: Format) => (AUDIO_FORMATS as readonly string[]).includes(f)

/* ─── Custom styled select (fixes invisible option text in dark mode) ─────── */
function StyledSelect({ value, onChange, options, label }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  label: string
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full appearance-none px-3 py-2.5 pr-8 rounded-xl
                     border-2 border-slate-800 dark:border-white/25
                     text-sm font-medium cursor-pointer focus:outline-none focus:border-violet-500
                     bg-white text-slate-900 dark:bg-[#111827] dark:text-white"
          style={{ colorScheme: "dark" }}>
          {options.map(o => (
            <option key={o.value} value={o.value}
              className="bg-white text-slate-900 dark:bg-[#111827] dark:text-white">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-500 dark:text-slate-400" />
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   Main Component — only rendered in browser (no SSR via dynamic import)
   ════════════════════════════════════════════════════════════════════════════ */
export default function MediaConverter() {
  const [files,        setFiles]        = useState<MediaFile[]>([])
  const [outputFormat, setOutputFormat] = useState<Format>("mp4")
  const [isConverting, setIsConverting] = useState(false)
  const [overallPct,   setOverallPct]   = useState(0)
  const [ffLoaded,     setFfLoaded]     = useState(false)
  const [ffLoading,    setFfLoading]    = useState(false)
  const [ffError,      setFfError]      = useState("")
  const [isDragging,   setIsDragging]   = useState(false)
  const [showAdv,      setShowAdv]      = useState(false)
  const [videoCodec,   setVideoCodec]   = useState("libx264")
  const [audioCodec,   setAudioCodec]   = useState("aac")
  const [dualOutput,   setDualOutput]   = useState(false)
  const [audioFmt,     setAudioFmt]     = useState<Format>("mp3")
  const [volumeBoost,  setVolumeBoost]  = useState(1.0)
  const [enhancement,  setEnhancement]  = useState<Enhancement>("none")
  const [mounted,      setMounted]      = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  /* FFmpeg ref — lazy-initialised inside useEffect (browser-only) */
  const ffRef    = useRef<FFmpeg | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
    // Instantiate FFmpeg only in browser
    ffRef.current = new FFmpeg()
    loadFF()
  }, [])

  /* ── Load FFmpeg ─────────────────────────────────────────────────────── */
  const loadFF = async () => {
    if (!ffRef.current || ffLoaded || ffLoading) return
    setFfLoading(true); setFfError("")
    try {
      const base = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd"
      await ffRef.current.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`,   "text/javascript"),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
      })
      setFfLoaded(true)
    } catch (e) {
      setFfError("Failed to load FFmpeg. Use Chrome/Edge (needs SharedArrayBuffer + COOP headers).")
    } finally { setFfLoading(false) }
  }

  /* ── File ingestion ──────────────────────────────────────────────────── */
  const addFiles = useCallback((list: FileList | null) => {
    if (!list) return
    const added: MediaFile[] = Array.from(list)
      .filter(f => f.type.startsWith("video/") || f.type.startsWith("audio/"))
      .map(f => ({
        id: uid(), file: f, name: f.name, size: fmtSize(f.size),
        kind: f.type.startsWith("video/") ? "video" : "audio",
        status: "idle", progress: 0,
      }))
    setFiles(prev => [...prev, ...added])
  }, [])

  const onDragOver  = (e: DragEvent) => { e.preventDefault(); setIsDragging(true)  }
  const onDragLeave = (e: DragEvent) => { e.preventDefault(); setIsDragging(false) }
  const onDrop      = (e: DragEvent) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files) }

  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id))
  const clearAll   = () => setFiles([])

  /* ── Download helper ─────────────────────────────────────────────────── */
  const download = (blob: Blob, baseName: string, ext: string) => {
    const url = URL.createObjectURL(blob)
    const a   = Object.assign(document.createElement("a"), {
      href: url, download: `${baseName.replace(/\.[^.]+$/, "")}_converted.${ext}`,
    })
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  const downloadAll = () =>
    files.filter(f => f.status === "done").forEach(f => {
      if (f.convertedBlob) download(f.convertedBlob, f.name, outputFormat)
      if (f.audioBlob)     download(f.audioBlob,     f.name, audioFmt)
    })

  /* ── Build audio filter chain ────────────────────────────────────────── */
  const buildAudioFilter = () => {
    const parts: string[] = []
    if (volumeBoost !== 1.0) parts.push(`volume=${volumeBoost.toFixed(2)}`)
    const ef = ENHANCEMENT_FILTERS[enhancement]
    if (ef) parts.push(ef)
    return parts.join(",") || null
  }

  /* ── Convert ─────────────────────────────────────────────────────────── */
  const convert = async () => {
    if (!ffRef.current || !ffLoaded || isConverting) return
    const pending = files.filter(f => f.status !== "done")
    if (!pending.length) return

    setIsConverting(true); setOverallPct(0)
    const ff      = ffRef.current
    const afChain = buildAudioFilter()

    for (let i = 0; i < pending.length; i++) {
      const file   = pending[i]
      const ext    = file.name.split(".").pop() ?? "mp4"
      const inName = `in_${i}.${ext}`

      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: "converting", progress: 0 } : f))

      try {
        await ff.writeFile(inName, await fetchFile(file.file))

        /* ── Primary output ── */
        const outName = `out_${i}.${outputFormat}`
        const args: string[] = ["-i", inName]

        if (isAudioFmt(outputFormat)) {
          args.push("-vn")
          args.push("-c:a", audioCodec === "copy" ? "copy" : audioCodec)
        } else {
          args.push("-c:v", videoCodec === "copy" ? "copy" : videoCodec)
          args.push("-c:a", audioCodec === "copy" ? "copy" : audioCodec)
          if (outputFormat === "mp4") args.push("-movflags", "+faststart")
        }

        if (afChain && audioCodec !== "copy") args.push("-af", afChain)
        args.push(outName)

        await ff.exec(args)
        const primData = await ff.readFile(outName)
        const primBlob = new Blob([primData])
        await ff.deleteFile(outName)

        /* ── Dual output (audio-only) ── */
        let audioBlob: Blob | undefined
        if (dualOutput && !isAudioFmt(outputFormat)) {
          const audioOut = `audio_${i}.${audioFmt}`
          const aCodec   = audioFmt === "mp3" ? "libmp3lame"
                         : audioFmt === "flac" ? "flac"
                         : audioFmt === "wav"  ? "pcm_s16le"
                         : audioFmt === "ogg"  ? "libvorbis"
                         : audioFmt === "opus" ? "libopus" : "aac"
          const aArgs = ["-i", inName, "-vn", "-c:a", aCodec]
          if (afChain) aArgs.push("-af", afChain)
          aArgs.push(audioOut)
          await ff.exec(aArgs)
          const aData = await ff.readFile(audioOut)
          audioBlob = new Blob([aData])
          await ff.deleteFile(audioOut)
        }

        await ff.deleteFile(inName)
        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: "done", progress: 100, convertedBlob: primBlob, audioBlob } : f
        ))
      } catch (err) {
        try { await ff.deleteFile(inName) } catch { /* noop */ }
        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: "error", error: String(err) } : f
        ))
      }

      setOverallPct(Math.round(((i + 1) / pending.length) * 100))
    }
    setIsConverting(false)
  }

  const card = "bg-white/80 dark:bg-white/[0.04] border-2 border-slate-800 dark:border-white/10 rounded-3xl p-5 backdrop-blur-sm"
  const doneCount = files.filter(f => f.status === "done").length

  /* ══════════════════════════════════════════════════════════════════ RENDER */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100
                    dark:from-[#060a18] dark:via-[#08102a] dark:to-[#060a18] transition-colors duration-500">

      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="opacity-0 dark:opacity-100 absolute -top-40 -left-32 w-[500px] h-[500px] rounded-full bg-purple-600/12 blur-[100px]" />
        <div className="opacity-0 dark:opacity-100 absolute -bottom-40 -right-32 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="relative shrink-0">
              <div className="w-13 h-13 rounded-2xl overflow-hidden
                              shadow-[0_0_0_2px_rgba(139,92,246,0.4),0_0_28px_rgba(139,92,246,0.5)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="Media Converter" className="w-14 h-14" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 dark:text-white leading-none">Media Converter</h1>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">FFmpeg WebAssembly · In-browser · Private</p>
            </div>
          </div>
          {mounted && (
            <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95
                         bg-white border border-slate-200 text-slate-500 hover:bg-slate-100
                         dark:bg-white/[0.07] dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/10">
              {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* ── FFmpeg status ───────────────────────────────────────────── */}
        <div className={`mb-5 flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-medium border-2 transition-all
                         ${ffError   ? "bg-red-50 border-red-300 text-red-700 dark:bg-red-500/10 dark:border-red-500/40 dark:text-red-300"
                         : ffLoaded  ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/40 dark:text-emerald-300"
                                     : "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/40 dark:text-amber-300"}`}>
          {ffError  ? <AlertCircle  className="w-4 h-4 shrink-0" />
          : ffLoaded ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                     : <Loader2     className="w-4 h-4 shrink-0 animate-spin" />}
          <span className="flex-1">
            {ffError  ? ffError
            : ffLoaded ? "FFmpeg ready — drop files below to begin"
                       : "Loading FFmpeg engine (~5 MB, one time)…"}
          </span>
          {ffError && (
            <button onClick={loadFF} className="flex items-center gap-1 text-xs font-bold underline hover:no-underline">
              <RefreshCw className="w-3 h-3" />Retry
            </button>
          )}
        </div>

        {/* ── Drag & drop zone ─────────────────────────────────────────── */}
        <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative mb-5 rounded-3xl border-2 border-dashed cursor-pointer
                       flex flex-col items-center justify-center gap-3 py-12 px-6 transition-all duration-200
                       ${isDragging
                         ? "border-violet-500 bg-violet-500/10 scale-[1.01] shadow-[0_0_40px_rgba(139,92,246,0.2)]"
                         : "border-slate-300 bg-white/70 hover:border-violet-400 hover:bg-violet-50/50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-violet-500/50"}`}>
          <input ref={inputRef} type="file" multiple accept="video/*,audio/*" className="hidden"
            onChange={e => addFiles(e.target.files)} />
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all
                           ${isDragging ? "bg-violet-500 shadow-[0_0_30px_rgba(139,92,246,0.6)]" : "bg-violet-100 dark:bg-violet-500/15"}`}>
            <Upload className={`w-8 h-8 ${isDragging ? "text-white" : "text-violet-500"}`} />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-slate-700 dark:text-slate-200">
              {isDragging ? "Drop files here!" : "Drag & drop or click to browse"}
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Video & audio · files stay on your device</p>
          </div>
        </div>

        {/* ── Output format picker ─────────────────────────────────────── */}
        <div className={`${card} mb-5`}>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Output Format</p>
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Film className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Video</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {VIDEO_FORMATS.map(f => (
                <button key={f} onClick={() => setOutputFormat(f)}
                  className={`px-3.5 py-2 rounded-xl border-2 text-sm font-black uppercase tracking-wide transition-all hover:scale-105 active:scale-95
                              ${outputFormat === f ? ACTIVE_FORMAT[f] : FORMAT_COLOR[f]}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Music className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Audio Only</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {AUDIO_FORMATS.map(f => (
                <button key={f} onClick={() => setOutputFormat(f)}
                  className={`px-3.5 py-2 rounded-xl border-2 text-sm font-black uppercase tracking-wide transition-all hover:scale-105 active:scale-95
                              ${outputFormat === f ? ACTIVE_FORMAT[f] : FORMAT_COLOR[f]}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Audio Enhancement ─────────────────────────────────────────── */}
        <div className={`${card} mb-5`}>
          <div className="flex items-center gap-2 mb-4">
            <Mic className="w-4 h-4 text-violet-500" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Audio Enhancement</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-5">
            {(Object.keys(ENHANCEMENT_INFO) as Enhancement[]).map(key => {
              const info   = ENHANCEMENT_INFO[key]
              const active = enhancement === key
              return (
                <button key={key} onClick={() => setEnhancement(key)}
                  className={`text-left p-3.5 rounded-2xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98]
                               ${active
                                 ? "border-violet-500 bg-violet-500/15 dark:bg-violet-500/20"
                                 : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] hover:border-slate-300 dark:hover:border-white/20"}`}>
                  <div className="text-lg mb-1">{info.icon}</div>
                  <p className={`text-sm font-bold ${active ? "text-violet-700 dark:text-violet-300" : "text-slate-700 dark:text-slate-200"}`}>
                    {info.label}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">{info.desc}</p>
                </button>
              )
            })}
          </div>

          {/* Volume boost */}
          <div className="border-t-2 border-slate-200 dark:border-white/10 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-violet-500" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Volume Boost</span>
              </div>
              <span className={`text-sm font-black tabular-nums px-2.5 py-0.5 rounded-lg
                               ${volumeBoost !== 1 ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
                                                   : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"}`}>
                {volumeBoost.toFixed(1)}×
              </span>
            </div>
            <input type="range" min={0.5} max={3.0} step={0.1} value={volumeBoost}
              onChange={e => setVolumeBoost(parseFloat(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer accent-violet-500
                         bg-slate-200 dark:bg-white/10" />
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-600 mt-1.5">
              <span>0.5× quieter</span><span>1× normal</span><span>3× louder</span>
            </div>
          </div>
        </div>

        {/* ── Advanced settings ─────────────────────────────────────────── */}
        <div className="mb-5">
          <button onClick={() => setShowAdv(s => !s)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400
                       hover:text-slate-700 dark:hover:text-slate-200 transition-colors mb-3">
            <Settings2 className="w-4 h-4" />
            Advanced Codec Settings
            {showAdv ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdv && (
            <div className={`${card} space-y-4`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StyledSelect label="Video Codec"  value={videoCodec} onChange={setVideoCodec} options={VIDEO_CODECS} />
                <StyledSelect label="Audio Codec"  value={audioCodec} onChange={setAudioCodec} options={AUDIO_CODECS} />
              </div>

              {/* Dual output */}
              <div className="border-t-2 border-slate-200 dark:border-white/10 pt-4">
                <div className="flex items-start gap-3 cursor-pointer" onClick={() => setDualOutput(d => !d)}>
                  <div className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
                                   ${dualOutput ? "bg-violet-500 border-violet-500" : "border-slate-400 dark:border-white/30 bg-white dark:bg-white/5"}`}>
                    {dualOutput && <span className="text-white text-xs font-black">✓</span>}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-violet-500" />
                      Dual Output — also extract audio track separately
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      Produces your video format AND an audio-only file in one go
                    </p>
                  </div>
                </div>
                {dualOutput && (
                  <div className="mt-3 ml-8">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Audio Track Format</p>
                    <div className="flex flex-wrap gap-1.5">
                      {AUDIO_FORMATS.map(f => (
                        <button key={f} onClick={() => setAudioFmt(f)}
                          className={`px-3 py-1.5 rounded-lg border-2 text-xs font-black uppercase tracking-wide transition-all
                                      ${audioFmt === f ? ACTIVE_FORMAT[f] : FORMAT_COLOR[f]}`}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── File list ───────────────────────────────────────────────── */}
        {files.length > 0 && (
          <div className={`${card} mb-5`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Files ({files.length})
                {dualOutput && !isAudioFmt(outputFormat) &&
                  <span className="ml-2 text-[10px] font-semibold text-violet-500 bg-violet-100 dark:bg-violet-500/15 px-1.5 py-0.5 rounded">
                    + audio track
                  </span>}
              </h2>
              <button onClick={clearAll}
                className="text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" />Clear all
              </button>
            </div>

            <div className="space-y-3">
              {files.map(file => (
                <div key={file.id}
                  className="flex items-center gap-3 p-3 rounded-2xl border-2 border-slate-800 dark:border-white/10
                             bg-slate-50 dark:bg-white/[0.03]">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                                   ${file.kind === "video" ? "bg-blue-100 dark:bg-blue-500/15" : "bg-rose-100 dark:bg-rose-500/15"}`}>
                    {file.kind === "video"
                      ? <FileVideo className="w-5 h-5 text-blue-500" />
                      : <FileAudio className="w-5 h-5 text-rose-500" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-slate-400">{file.size}</span>
                      {file.status === "converting" && (
                        <span className="flex items-center gap-1 text-xs text-violet-500">
                          <Loader2 className="w-3 h-3 animate-spin" />Converting…
                        </span>
                      )}
                      {file.status === "done" && (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          Done → .{outputFormat}{file.audioBlob ? ` + .${audioFmt}` : ""}
                        </span>
                      )}
                      {file.status === "error" && (
                        <span className="flex items-center gap-1 text-xs text-red-500">
                          <AlertCircle className="w-3 h-3" />Failed
                        </span>
                      )}
                    </div>
                    {file.status === "converting" && (
                      <div className="mt-2 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full animate-pulse w-3/4" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {file.status === "done" && file.convertedBlob && (
                      <button onClick={() => download(file.convertedBlob!, file.name, outputFormat)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center
                                   bg-emerald-100 text-emerald-600 hover:bg-emerald-200
                                   dark:bg-emerald-500/20 dark:text-emerald-400
                                   transition-all hover:scale-110 active:scale-95"
                        title={`Download .${outputFormat}`}>
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    {file.status === "done" && file.audioBlob && (
                      <button onClick={() => download(file.audioBlob!, file.name, audioFmt)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center
                                   bg-purple-100 text-purple-600 hover:bg-purple-200
                                   dark:bg-purple-500/20 dark:text-purple-400
                                   transition-all hover:scale-110 active:scale-95"
                        title={`Download .${audioFmt} audio`}>
                        <Music className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => removeFile(file.id)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center
                                 bg-red-100 text-red-500 hover:bg-red-200
                                 dark:bg-red-500/15 dark:text-red-400
                                 transition-all hover:scale-110 active:scale-95">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Overall progress ─────────────────────────────────────────── */}
        {isConverting && (
          <div className="bg-white/80 dark:bg-white/[0.04] border-2 border-violet-500/40 rounded-2xl p-4 mb-5">
            <div className="flex justify-between text-sm font-semibold mb-2">
              <span className="text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-violet-500" />Converting…
              </span>
              <span className="text-violet-600 dark:text-violet-400">{overallPct}%</span>
            </div>
            <div className="h-2.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${overallPct}%` }} />
            </div>
          </div>
        )}

        {/* ── Action buttons ───────────────────────────────────────────── */}
        <div className="flex gap-3">
          <button onClick={convert}
            disabled={!ffLoaded || isConverting || files.length === 0}
            className="flex-1 py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2
                       bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500
                       disabled:opacity-40 disabled:cursor-not-allowed
                       transition-all hover:scale-[1.02] active:scale-[0.98]
                       shadow-[0_4px_20px_rgba(139,92,246,0.4)]">
            {isConverting
              ? <><Loader2 className="w-5 h-5 animate-spin" />Converting…</>
              : <><Zap className="w-5 h-5" />Convert → .{outputFormat.toUpperCase()}{dualOutput && !isAudioFmt(outputFormat) ? ` + .${audioFmt.toUpperCase()}` : ""}</>}
          </button>
          {doneCount > 0 && (
            <button onClick={downloadAll}
              className="py-3.5 px-5 rounded-2xl font-bold text-white flex items-center justify-center gap-2
                         bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500
                         transition-all hover:scale-[1.02] active:scale-[0.98]
                         shadow-[0_4px_20px_rgba(16,185,129,0.4)]">
              <DownloadCloud className="w-5 h-5" />
              {doneCount > 1 ? `All (${doneCount})` : "Download"}
            </button>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-700 mt-6">
          🔒 Files never leave your device · Powered by FFmpeg WebAssembly
        </p>
      </div>
    </div>
  )
}
