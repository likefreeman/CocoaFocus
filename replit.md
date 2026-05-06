# CocoaFocus

A healing Pomodoro timer app with soothing white noise and a skeuomorphic interface — every focus session feels like a warm, quiet moment with a soft companion.

## Run & Operate

- **Dev**: `npm run dev` (serves on port 5000)
- **Build**: `npm run build`

## Stack

- React 18 + TypeScript
- Vite 6 (dev server on port 5000, host 0.0.0.0)
- Web Audio API (for generative white noise / ambient sounds)
- No backend — fully client-side

## Where things live

- `src/App.tsx` — main app logic (timer, modes, noise)
- `src/App.css` — skeuomorphic styling, cocoa color tokens
- `src/index.css` — global reset + CSS variables
- `public/favicon.svg` — paw icon

## Architecture decisions

- All timer state managed in-memory via React hooks (no persistence intentional for simplicity)
- Ambient audio generated via Web Audio API buffers — no external audio files needed
- Skeuomorphic physical button effect via layered box-shadows and translateY transforms
- Single-page app, no routing needed

## Product

- 3 modes: Focus (25m), Short Break (5m), Long Break (15m)
- 5 ambient sounds: Silence, Rain, Café, Forest, White Noise
- Volume control for ambient sounds
- Session counter tracking completed focus sessions (4-dot pomodoro cycle)
- Physical push-button aesthetic for timer start/pause

## User preferences

_Populate as you learn user preferences_

## Gotchas

- Audio context must be created/resumed after user gesture (browser policy)
- `allowedHosts: true` in vite.config.ts required for Replit proxy
