import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import { createAudioEngine, type SoundType } from './audio'
import { requestNotifyPermission, sendNotification, type NotifyMode } from './notify'

type Mode = 'focus' | 'short' | 'long'

const DEFAULT_MINUTES: Record<Mode, number> = {
  focus: 25,
  short: 5,
  long: 15,
}

const MODE_LABELS: Record<Mode, string> = {
  focus: '专注',
  short: '短休息',
  long: '长休息',
}

const MODE_RANGE: Record<Mode, [number, number]> = {
  focus: [1, 90],
  short: [1, 30],
  long:  [1, 60],
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

interface FruitItem { id: number; emoji: string; x: number; falling: boolean }
interface Toast      { id: number; mode: Mode }

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
  // Custom minutes per mode
  const [customMinutes, setCustomMinutes] = useState<Record<Mode, number>>({ ...DEFAULT_MINUTES })
  const [timeLeft, setTimeLeft] = useState(DEFAULT_MINUTES.focus * 60)
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
  // Settings panel
  const [showSettings, setShowSettings] = useState(false)
  // Jar reset confirm
  const [jarResetAnim, setJarResetAnim] = useState(false)

  const audioRef = useRef(createAudioEngine())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevSound = useRef<SoundType>('none')
  const completedModeRef = useRef<Mode>('focus')

  // Derived total seconds for current mode
  const totalSeconds = customMinutes[mode] * 60

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
    audioRef.current.playChime()
    sendNotification(finishedMode as NotifyMode)
    const tid = ++toastCounter
    setToasts(prev => [...prev, { id: tid, mode: finishedMode }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== tid)), 5000)
    setTimeLeft(customMinutes[finishedMode] * 60)
    if (finishedMode === 'focus') { setSessions(s => s + 1); dropFruit() }
    setCompleted(false)
  }, [completed])

  useEffect(() => { completedModeRef.current = mode }, [mode])

  const dropFruit = useCallback(() => {
    const id = ++fruitCounter
    const emoji = FRUITS[Math.floor(Math.random() * FRUITS.length)]
    const x = 15 + Math.random() * 70
    setFruits(prev => [...prev, { id, emoji, x, falling: true }])
    setTimeout(() => setFruits(prev => prev.map(f => f.id === id ? { ...f, falling: false } : f)), 1400)
  }, [])

  // Sync sound
  useEffect(() => {
    const engine = audioRef.current
    if (sound !== prevSound.current) {
      engine.stop()
      if (sound !== 'none' && isRunning) engine.setSound(sound, volume)
      prevSound.current = sound
    }
  }, [sound, isRunning, volume])

  useEffect(() => { audioRef.current.setVolume(volume) }, [volume])

  const handleModeChange = (m: Mode) => {
    setModePressed(m)
    setTimeout(() => setModePressed(null), 200)
    setMode(m)
    setTimeLeft(customMinutes[m] * 60)
    setIsRunning(false)
    audioRef.current.stop()
    prevSound.current = 'none'
  }

  const handleToggle = async () => {
    setBtnScale(true)
    setTimeout(() => setBtnScale(false), 300)
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
    setTimeLeft(customMinutes[mode] * 60)
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

  // Custom duration change
  const handleMinuteChange = (m: Mode, delta: number) => {
    const [min, max] = MODE_RANGE[m]
    setCustomMinutes(prev => {
      const next = Math.min(max, Math.max(min, prev[m] + delta))
      // If changing current mode and not running, reset timer too
      if (m === mode && !isRunning) setTimeLeft(next * 60)
      return { ...prev, [m]: next }
    })
  }

  const handleMinuteInput = (m: Mode, val: string) => {
    const n = parseInt(val)
    if (isNaN(n)) return
    const [min, max] = MODE_RANGE[m]
    const clamped = Math.min(max, Math.max(min, n))
    setCustomMinutes(prev => {
      if (m === mode && !isRunning) setTimeLeft(clamped * 60)
      return { ...prev, [m]: clamped }
    })
  }

  // Jar reset
  const handleJarReset = () => {
    setJarResetAnim(true)
    setTimeout(() => { setFruits([]); setJarResetAnim(false) }, 350)
  }

  const dismissToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id))

  const progress = timeLeft === 0 ? 0 : 1 - timeLeft / totalSeconds
  const dashOffset = CIRCUMFERENCE * (1 - progress)
  const settledFruits = fruits.filter(f => !f.falling)

  return (
    <div className="shell" onClick={() => showSettings && setShowSettings(false)}>
      {/* Falling fruits */}
      <div className="fruit-stage" aria-hidden>
        {fruits.map(f => (
          <div key={f.id} className={`fruit-drop ${f.falling ? 'falling' : 'settled'}`} style={{ left: `${f.x}%` }}>
            {f.emoji}
          </div>
        ))}
      </div>

      {/* Toast stack */}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map(t => {
          const c = TOAST_CONTENT[t.mode]
          return (
            <div key={t.id} className="toast" onClick={() => dismissToast(t.id)}>
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
              <div key={i} className={`dot ${i < sessions % 4 ? 'on' : ''}`} />
            ))}
          </div>
          <span className="session-text">{sessions} 次专注</span>
          {notifyGranted && <span className="notify-badge" title="通知已开启">🔔</span>}
        </div>
      </header>

      <main className="main">
        {/* Mode selector + settings panel wrapper */}
        <div className="mode-bar-wrap">
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
            {/* Settings gear */}
            <button
              className={`settings-btn ${showSettings ? 'open' : ''}`}
              onClick={e => { e.stopPropagation(); setShowSettings(s => !s) }}
              title="自定义时长"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div className="settings-panel" onClick={e => e.stopPropagation()}>
              <div className="settings-title">自定义时长（分钟）</div>
              {(['focus', 'short', 'long'] as Mode[]).map(m => (
                <div key={m} className="settings-row">
                  <span className="settings-label">{MODE_LABELS[m]}</span>
                  <div className="settings-stepper">
                    <button
                      className="stepper-btn"
                      onClick={() => handleMinuteChange(m, -1)}
                      disabled={customMinutes[m] <= MODE_RANGE[m][0]}
                    >−</button>
                    <input
                      type="number"
                      className="stepper-input"
                      value={customMinutes[m]}
                      min={MODE_RANGE[m][0]}
                      max={MODE_RANGE[m][1]}
                      onChange={e => handleMinuteInput(m, e.target.value)}
                    />
                    <button
                      className="stepper-btn"
                      onClick={() => handleMinuteChange(m, 1)}
                      disabled={customMinutes[m] >= MODE_RANGE[m][1]}
                    >＋</button>
                  </div>
                </div>
              ))}
              <button
                className="settings-reset-btn"
                onClick={() => {
                  setCustomMinutes({ ...DEFAULT_MINUTES })
                  if (!isRunning) setTimeLeft(DEFAULT_MINUTES[mode] * 60)
                }}
              >恢复默认</button>
            </div>
          )}
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
              {progress > 0.01 && progress < 0.999 && (
                <circle
                  cx={RING_CX + RING_R * Math.cos(-Math.PI / 2 + 2 * Math.PI * progress)}
                  cy={RING_CY + RING_R * Math.sin(-Math.PI / 2 + 2 * Math.PI * progress)}
                  r="7" fill="white" opacity="0.9" filter="url(#glow)"
                />
              )}
            </svg>

            <div className="ring-inner">
              <div className="time-display">{formatTime(timeLeft)}</div>
              <div className="time-mode">
                {MODE_LABELS[mode]}
                <span className="time-total"> · {customMinutes[mode]}分钟</span>
              </div>
              {isRunning && <div className="pulse-ring" />}
            </div>
          </div>

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
            <div className="jar-header">
              <div className="jar-title">收集罐 · {settledFruits.length} 个</div>
              <button
                className={`jar-reset-btn ${jarResetAnim ? 'shake' : ''}`}
                onClick={handleJarReset}
                title="清空收集罐"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
                清空
              </button>
            </div>
            <div className={`jar ${jarResetAnim ? 'jar-empty-anim' : ''}`}>
              <div className="jar-inner">
                {settledFruits.map(f => (
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
