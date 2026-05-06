import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

type Mode = 'focus' | 'short' | 'long'
type NoiseType = 'none' | 'rain' | 'cafe' | 'forest' | 'white'

const DURATIONS: Record<Mode, number> = {
  focus: 25 * 60,
  short: 5 * 60,
  long: 15 * 60,
}

const MODE_LABELS: Record<Mode, string> = {
  focus: 'Focus',
  short: 'Short Break',
  long: 'Long Break',
}

const NOISE_LABELS: Record<NoiseType, string> = {
  none: 'Silence',
  rain: 'Rain',
  cafe: 'Café',
  forest: 'Forest',
  white: 'White Noise',
}

function generateNoise(ctx: AudioContext, type: NoiseType): AudioNode | null {
  if (type === 'none') return null

  if (type === 'white') {
    const bufferSize = ctx.sampleRate * 2
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const gain = ctx.createGain()
    gain.gain.value = 0.05
    source.connect(gain)
    source.start()
    return gain
  }

  if (type === 'rain') {
    const bufferSize = ctx.sampleRate * 3
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (Math.random() < 0.002 ? 0.8 : 0.1)
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 1200
    const gain = ctx.createGain()
    gain.gain.value = 0.3
    source.connect(filter)
    filter.connect(gain)
    source.start()
    return gain
  }

  if (type === 'cafe') {
    const bufferSize = ctx.sampleRate * 4
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate
      data[i] = (Math.random() * 2 - 1) * 0.05 +
        Math.sin(2 * Math.PI * 220 * t) * 0.005 +
        Math.sin(2 * Math.PI * 330 * t) * 0.003
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 800
    filter.Q.value = 0.5
    const gain = ctx.createGain()
    gain.gain.value = 0.25
    source.connect(filter)
    filter.connect(gain)
    source.start()
    return gain
  }

  if (type === 'forest') {
    const bufferSize = ctx.sampleRate * 3
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate
      data[i] = (Math.random() * 2 - 1) * 0.06 +
        Math.sin(2 * Math.PI * 440 * t) * 0.002 * Math.random() +
        Math.sin(2 * Math.PI * 880 * t) * 0.001 * Math.random()
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 600
    const gain = ctx.createGain()
    gain.gain.value = 0.2
    source.connect(filter)
    filter.connect(gain)
    source.start()
    return gain
  }

  return null
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function PawIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <circle cx="6" cy="8" r="2"/>
      <circle cx="10" cy="5.5" r="2"/>
      <circle cx="14" cy="5.5" r="2"/>
      <circle cx="18" cy="8" r="2"/>
      <path d="M12 10c-3 0-6 2-6.5 5.5C5 18.5 7 21 12 21s7-2.5 6.5-5.5C18 12 15 10 12 10z"/>
    </svg>
  )
}

export default function App() {
  const [mode, setMode] = useState<Mode>('focus')
  const [timeLeft, setTimeLeft] = useState(DURATIONS.focus)
  const [isRunning, setIsRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const [noise, setNoise] = useState<NoiseType>('none')
  const [volume, setVolume] = useState(0.5)
  const [buttonPressed, setButtonPressed] = useState(false)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const noiseNodeRef = useRef<AudioNode | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopNoise = useCallback(() => {
    if (noiseNodeRef.current) {
      try {
        (noiseNodeRef.current as AudioBufferSourceNode).disconnect?.()
      } catch {}
      noiseNodeRef.current = null
    }
  }, [])

  const startNoise = useCallback((type: NoiseType, vol: number) => {
    stopNoise()
    if (type === 'none') return

    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext()
    }
    const ctx = audioCtxRef.current

    if (!masterGainRef.current || masterGainRef.current.context !== ctx) {
      masterGainRef.current = ctx.createGain()
      masterGainRef.current.connect(ctx.destination)
    }

    masterGainRef.current.gain.value = vol

    const node = generateNoise(ctx, type)
    if (node) {
      node.connect(masterGainRef.current)
      noiseNodeRef.current = node
    }
  }, [stopNoise])

  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volume
    }
  }, [volume])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current!)
            setIsRunning(false)
            if (mode === 'focus') setSessions(s => s + 1)
            return 0
          }
          return t - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning, mode])

  const handleModeChange = (m: Mode) => {
    setMode(m)
    setTimeLeft(DURATIONS[m])
    setIsRunning(false)
  }

  const handleToggle = () => {
    if (!isRunning && noise !== 'none') {
      startNoise(noise, volume)
    } else if (isRunning && noise !== 'none') {
      stopNoise()
    }
    setIsRunning(r => !r)
    setButtonPressed(true)
    setTimeout(() => setButtonPressed(false), 150)
  }

  const handleReset = () => {
    setIsRunning(false)
    setTimeLeft(DURATIONS[mode])
    stopNoise()
  }

  const handleNoiseChange = (n: NoiseType) => {
    setNoise(n)
    if (isRunning) {
      if (n === 'none') stopNoise()
      else startNoise(n, volume)
    }
  }

  const progress = 1 - timeLeft / DURATIONS[mode]
  const circumference = 2 * Math.PI * 110

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="logo">
          <PawIcon />
          <span>CocoaFocus</span>
        </div>
        <div className="session-count">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className={`session-dot ${i < sessions % 4 ? 'filled' : ''}`} />
          ))}
          <span className="session-label">{sessions} sessions</span>
        </div>
      </header>

      <main className="app-main">
        <div className="mode-tabs">
          {(['focus', 'short', 'long'] as Mode[]).map(m => (
            <button
              key={m}
              className={`mode-tab ${mode === m ? 'active' : ''}`}
              onClick={() => handleModeChange(m)}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        <div className="timer-card">
          <div className="timer-ring-container">
            <svg className="timer-ring" viewBox="0 0 240 240">
              <circle
                cx="120" cy="120" r="110"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="8"
              />
              <circle
                cx="120" cy="120" r="110"
                fill="none"
                stroke="var(--cocoa-gold)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                transform="rotate(-90 120 120)"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div className="timer-display">
              <div className="timer-time">{formatTime(timeLeft)}</div>
              <div className="timer-mode-label">{MODE_LABELS[mode]}</div>
            </div>
          </div>

          <div className="timer-controls">
            <button className="control-btn reset-btn" onClick={handleReset} title="Reset">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
            </button>

            <button
              className={`control-btn start-btn ${isRunning ? 'running' : ''} ${buttonPressed ? 'pressed' : ''}`}
              onClick={handleToggle}
            >
              {isRunning ? (
                <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                  <rect x="6" y="4" width="4" height="16" rx="1"/>
                  <rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                  <path d="M8 5.14v14l11-7-11-7z"/>
                </svg>
              )}
            </button>

            <button className="control-btn skip-btn" onClick={() => handleReset()} title="Skip">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M6 18L14.5 12 6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="noise-panel">
          <div className="noise-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
            <span>Ambient Sound</span>
          </div>
          <div className="noise-options">
            {(['none', 'rain', 'cafe', 'forest', 'white'] as NoiseType[]).map(n => (
              <button
                key={n}
                className={`noise-btn ${noise === n ? 'active' : ''}`}
                onClick={() => handleNoiseChange(n)}
              >
                {n === 'none' && '🔇'}
                {n === 'rain' && '🌧️'}
                {n === 'cafe' && '☕'}
                {n === 'forest' && '🌿'}
                {n === 'white' && '〰️'}
                <span>{NOISE_LABELS[n]}</span>
              </button>
            ))}
          </div>
          {noise !== 'none' && (
            <div className="volume-control">
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                className="volume-slider"
              />
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM18.5 12c0-2.77-1.5-5.15-3.75-6.45v12.87C16.99 17.14 18.5 14.77 18.5 12z"/>
              </svg>
            </div>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <span>Made with warmth for focused minds</span>
      </footer>
    </div>
  )
}
