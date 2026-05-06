# CocoaFocus

A healing Pomodoro timer with soft neumorphic design, 3 generative ambient soundscapes, and a fruit collection jar — every focus session feels like a warm, quiet ritual.

## Run & Operate

- **Dev**: `npm run dev` (port 5000, host 0.0.0.0)
- **Build**: `npm run build`

## Stack

- React 18 + TypeScript
- Vite 6
- Web Audio API (generative audio — no external files)
- No backend — fully client-side

## Where things live

- `src/App.tsx` — main UI, timer logic, fruit drop system
- `src/audio.ts` — Web Audio engine: pink noise, fire crackle, cat purr
- `src/App.css` — soft neumorphic styles, animations
- `src/index.css` — CSS variables (oat/cream/red palette)

## Architecture decisions

- Audio generated via Web Audio API (pink noise + filters for rain, crackle for fire, low-freq oscillators for purr)
- Fruit drop uses CSS keyframe animations with fixed-position overlay stage
- Timer ring uses SVG stroke-dashoffset + live-calculated tip dot
- All state in-memory (React hooks), no persistence by design

## Product

- 3 modes: 专注 (25m), 短休息 (5m), 长休息 (15m)
- 3 healing sounds: 林间落雨, 炉火微醺, 猫咪打呼噜 — plus silence
- Volume slider with neumorphic track
- Fruit/coconut drop animation when focus session completes; collects in a jar
- Bouncy Q弹 button animations throughout
- Soft neumorphic + frosted glass design: coconut milk white, oat beige, warm light red

## User preferences

- Chinese UI labels
- Soft Neumorphic / flat-rounded visual style
- Healing, cozy aesthetic — coconut milk white (#FAF8F5), oat beige (#EDE4D8), light red (#E8A598)
- Q弹 bouncy/elastic button animations

## Gotchas

- AudioContext must resume after user gesture (browser autoplay policy) — handled in engine
- `allowedHosts: true` in vite.config.ts required for Replit proxy
