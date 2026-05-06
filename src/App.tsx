import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import { createAudioEngine, type SoundType } from './audio'
import { requestNotifyPermission, sendNotification, type NotifyMode } from './notify'

type Mode = 'focus' | 'short' | 'long'

const DURATIONS: Record<Mode, number> = {
  focus: 25 * 60,
  short: 5 * 60,
  long: 15 * 60,
}

const MODE_LABELS: Record<Mode, string> = {
  focus: '专注',
  short: '短休息',
  long: '长休息',
}

const SOUNDS: { id: SoundType; emoji: string; label: string }[] = [
  { id: 'none',  emoji: '🔇', label: '静音' },
  { id: 'rain',  emoji: '🌧️', label: '林间落雨' },
  { id: 'fire',  emoji: '🔥', label: '炉火微醺' },
  { id: 'cat',   emoji: '🐱', label: '猫咪打呼噜' },
]

const TOAST_CONTENT: Record<Mode, { emoji: string; title: string; sub: string }> = {
  focus: { emoji: '🥥', title: '专注完成！', sub: '休息一下，喝口水~' },
  short: { emoji: '☀️', title: '短休息结束', sub: '准备好了吗？继续加油！' },
  long:  { emoji: '🌿', title: '长休息结束', sub: '精力满满，全速前进！' },
}

const FRUITS = ['🥥', '🍑', '🍓', '🍒', '🌸', '🍊', '🍋']

interface FruitItem {
  id: number
  emoji: string
  x: number
  falling: boolean
}

interface Toast {
  id: number
  mode: Mode
}

function formatTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

const RING_R = 108
const RING_CX = 120
const RING_CY = 120
const CIRCUMFERENCE = 2 * Math.PI * RING_R

let fruitCounter = Date.now()
let toastCounter = Date.now()

export default function App() {
  const [mode, setMode] = useState<Mode>('focus')
  const [timeLeft, setTimeLeft] = useState(DURATIONS.focus)
  const [isRunning, setIsRunning] = useState(false)
  const [sound, setSound] = useState<SoundType>('none')
  const [volume, setVolume] = useState(0.6)
  const [fruits, setFruits] = useState<FruitItem[]>([])
  const [sessions, setSessions] = useState(0)
  const [btnScale, setBtnScale] = useState(false)
  const [modePressed, setModePressed] = useState<Mode | null>(null)
  const [soundPressed, setSoundPressed] = useState<SoundType | null>(null)
  const [completed, setCompleted] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [notifyGranted, setNotifyGranted] = useState(false)
  const [notifyAsked, setNotifyAsked] = useState(false)

  const audioRef = useRef(createAudioEngine())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevSound = useRef<SoundType>('none')
  const completedModeRef = useRef<Mode>('focus')

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current!)
            setIsRunning(false)
            setCompleted(true)
            return 0
          }
          return t - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning])

  // On completion
  useEffect(() => {
    if (!completed) return
    const finishedMode = completedModeRef.current

    // 1. Play chime
    audioRef.current.playChime()

    // 2. Browser notification
    sendNotification(finishedMode as NotifyMode)

    // 3. In-app toast
    const tid = ++toastCounter
    setToasts(prev => [...prev, { id: tid, mode: finishedMode }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== tid)), 5000)

    // 4. Drop fruit + count session
    if (finishedMode === 'focus') {
      setSessions(s => s + 1)
      dropFruit()
    }

    setCompleted(false)
  }, [completed])

  // Track which mode was active when timer finishes
  useEffect(() => {
    completedModeRef.current = mode
  }, [mode])

  const dropFruit = useCallback(() => {
    const id = ++fruitCounter
    const emoji = FRUITS[Math.floor(Math.random() * FRUITS.length)]
    const x = 15 + Math.random() * 70
    setFruits(prev => [...prev, { id, emoji, x, falling: true }])
    setTimeout(() => {
      setFruits(prev => prev.map(f => f.id === id ? { ...f, falling: false } : f))
    }, 1400)
  }, [])

  // Sync sound
  useEffect(() => {
    const engine = audioRef.current
    if (sound !== prevSound.current) {
      if (sound === 'none' || !isRunning) {
        engine.stop()
        if (sound !== 'none' && isRunning) engine.setSound(sound, volume)
      } else {
        engine.setSound(sound, volume)
      }
      prevSound.current = sound
    }
  }, [sound, isRunning, volume])

  useEffect(() => {
    audioRef.current.setVolume(volume)
  }, [volume])

  const handleModeChange = (m: Mode) => {
    setModePressed(m)
    setTimeout(() => setModePressed(null), 200)
    setMode(m)
    setTimeLeft(DURATIONS[m])
    setIsRunning(false)
    audioRef.current.stop()
    prevSound.current = 'none'
  }

  const handleToggle = async () => {
    setBtnScale(true)
    setTimeout(() => setBtnScale(false), 300)

    // Ask for notification permission on first play
    if (!notifyAsked) {
      setNotifyAsked(true)
      const granted = await requestNotifyPermission()
      setNotifyGranted(granted)
    }

    if (isRunning) {
      setIsRunning(false)
      audioRef.current.stop()
    } else {
      setIsRunning(true)
      if (sound !== 'none') audioRef.current.setSound(sound, volume)
    }
  }

  const handleReset = () => {
    setIsRunning(false)
    setTimeLeft(DURATIONS[mode])
    audioRef.current.stop()
  }

  const handleSoundChange = (s: SoundType) => {
    setSoundPressed(s)
    setTimeout(() => setSoundPressed(null), 180)
    setSound(s)
    if (isRunning) {
      if (s === 'none') audioRef.current.stop()
      else audioRef.current.setSound(s, volume)
    }
  }

  const dismissToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id))

  const progress = 1 - timeLeft / DURATIONS[mode]
  const dashOffset = CIRCUMFERENCE * (1 - progress)

  return (
    <div className="shell">
      {/* Falling fruits */}
      <div className="fruit-stage" aria-hidden>
        {fruits.map(f => (
          <div
            key={f.id}
            className={`fruit-drop ${f.falling ? 'falling' : 'settled'}`}
            style={{ left: `${f.x}%` }}
          >
            {f.emoji}
          </div>
        ))}
      </div>

      {/* Toast stack */}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t, i) => {
          const c = TOAST_CONTENT[t.mode]
          return (
            <div
              key={t.id}
              className="toast"
              style={{ '--i': i } as React.CSSProperties}
              onClick={() => dismissToast(t.id)}
            >
              <span className="toast-emoji">{c.emoji}</span>
              <div className="toast-body">
                <div className="toast-title">{c.title}</div>
                <div className="toast-sub">{c.sub}</div>
              </div>
              <button className="toast-close" onClick={e => { e.stopPropagation(); dismissToast(t.id) }}>×</button>
              <div className="toast-progress" />
            </div>
          )
        })}
      </div>

      {/* Header */}
      <header className="header">
        <div className="logo">
          <span className="logo-icon">🥥</span>
          <span className="logo-text">CocoaFocus</span>
        </div>
        <div className="session-info">
          <div className="session-dots">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`dot ${i < sessions % 4 ? 'on' : ''}`}
              />
            ))}
          </div>
          <span className="session-text">{sessions} 次专注</span>
          {notifyGranted && (
            <span className="notify-badge" title="通知已开启">🔔</span>
          )}
        </div>
      </header>

      <main className="main">
        {/* Mode selector */}
        <div className="mode-bar">
          {(['focus', 'short', 'long'] as Mode[]).map(m => (
            <button
              key={m}
              className={`mode-btn ${mode === m ? 'active' : ''} ${modePressed === m ? 'pressed' : ''}`}
              onClick={() => handleModeChange(m)}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Timer card */}
        <div className="timer-card">
          <div className="ring-wrap">
            <svg className="ring-svg" viewBox="0 0 240 240">
              <defs>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E8A598" />
                  <stop offset="50%" stopColor="#D4957A" />
                  <stop offset="100%" stopColor="#C9A882" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <circle cx={RING_CX} cy={RING_CY} r={RING_R} fill="none" stroke="#EDE4D8" strokeWidth="10" />
              <circle
                cx={RING_CX} cy={RING_CY} r={RING_R}
                fill="none" stroke="url(#ringGrad)" strokeWidth="14" strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${RING_CX} ${RING_CY})`}
                filter="url(#glow)" opacity="0.5"
              />
              <circle
                cx={RING_CX} cy={RING_CY} r={RING_R}
                fill="none" stroke="url(#ringGrad)" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${RING_CX} ${RING_CY})`}
              />
              {progress > 0.01 && (
                <circle
                  cx={RING_CX + RING_R * Math.cos(-Math.PI / 2 + 2 * Math.PI * progress)}
                  cy={RING_CY + RING_R * Math.sin(-Math.PI / 2 + 2 * Math.PI * progress)}
                  r="7" fill="white" opacity="0.9" filter="url(#glow)"
                />
              )}
            </svg>

            <div className="ring-inner">
              <div className="time-display">{formatTime(timeLeft)}</div>
              <div className="time-mode">{MODE_LABELS[mode]}</div>
              {isRunning && <div className="pulse-ring" />}
            </div>
          </div>

          {/* Controls */}
          <div className="controls">
            <button className="ctrl-btn sm" onClick={handleReset} title="重置">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
            </button>

            <button
              className={`ctrl-btn lg ${isRunning ? 'pause' : 'play'} ${btnScale ? 'bounce' : ''}`}
              onClick={handleToggle}
            >
              {isRunning ? (
                <svg viewBox="0 0 24 24" fill="currentColor" width="30" height="30">
                  <rect x="6" y="4" width="4" height="16" rx="2"/>
                  <rect x="14" y="4" width="4" height="16" rx="2"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" width="30" height="30">
                  <path d="M8 5.14v14l11-7-11-7z"/>
                </svg>
              )}
            </button>

            <button className="ctrl-btn sm" onClick={dropFruit} title="收集果实">
              <span style={{ fontSize: 18 }}>🥥</span>
            </button>
          </div>
        </div>

        {/* Sound panel */}
        <div className="sound-card">
          <div className="sound-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
            </svg>
            <span>治愈音景</span>
          </div>
          <div className="sound-grid">
            {SOUNDS.map(s => (
              <button
                key={s.id}
                className={`sound-btn ${sound === s.id ? 'active' : ''} ${soundPressed === s.id ? 'pressed' : ''}`}
                onClick={() => handleSoundChange(s.id)}
              >
                <span className="sound-emoji">{s.emoji}</span>
                <span className="sound-label">{s.label}</span>
              </button>
            ))}
          </div>

          {sound !== 'none' && (
            <div className="volume-row">
              <span className="vol-icon">🔈</span>
              <div className="slider-track">
                <input
                  type="range" min="0" max="1" step="0.01"
                  value={volume}
                  onChange={e => setVolume(+e.target.value)}
                  className="vol-slider"
                />
                <div className="slider-fill" style={{ width: `${volume * 100}%` }} />
              </div>
              <span className="vol-icon">🔊</span>
            </div>
          )}
        </div>

        {/* Fruit jar */}
        {fruits.length > 0 && (
          <div className="jar-area">
            <div className="jar-title">收集罐 · {fruits.filter(f => !f.falling).length} 个</div>
            <div className="jar">
              <div className="jar-inner">
                {fruits.filter(f => !f.falling).map(f => (
                  <span key={f.id} className="jar-fruit">{f.emoji}</span>
                ))}
              </div>
              <div className="jar-glass" />
            </div>
          </div>
        )}
      </main>

      <footer className="footer">用专注酿造每一刻的温柔</footer>
    </div>
  )
}
