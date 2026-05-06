export type SoundType = 'none' | 'rain' | 'fire' | 'cat';

export interface AudioEngine {
  setSound(type: SoundType, volume: number): void;
  setVolume(volume: number): void;
  stop(): void;
  playChime(): void;
}

function createPinkNoise(ctx: AudioContext, bufferSize: number): AudioBufferSourceNode {
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  return src;
}

function createRainSound(ctx: AudioContext, masterGain: GainNode): () => void {
  const bufferSize = ctx.sampleRate * 4;
  const src = createPinkNoise(ctx, bufferSize);

  const hipass = ctx.createBiquadFilter();
  hipass.type = 'highpass';
  hipass.frequency.value = 300;

  const lopass = ctx.createBiquadFilter();
  lopass.type = 'lowpass';
  lopass.frequency.value = 3500;

  const gain = ctx.createGain();
  gain.gain.value = 0.6;

  // Gentle LFO for rain variation
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.08;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.08;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  lfo.start();

  src.connect(hipass);
  hipass.connect(lopass);
  lopass.connect(gain);
  gain.connect(masterGain);
  src.start();

  return () => {
    try { src.stop(); src.disconnect(); } catch {}
    try { lfo.stop(); } catch {}
    try { gain.disconnect(); hipass.disconnect(); lopass.disconnect(); } catch {}
  };
}

function createFireSound(ctx: AudioContext, masterGain: GainNode): () => void {
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + w * 0.04;
      b1 = 0.96 * b1 + w * 0.08;
      b2 = 0.85 * b2 + w * 0.15;
      // Add random crackle pops
      const crackle = Math.random() < 0.0003 ? (Math.random() * 2 - 1) * 0.7 : 0;
      data[i] = (b0 + b1 * 0.5 + b2 * 0.3 + crackle) * 0.3;
    }
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;

  const lopass = ctx.createBiquadFilter();
  lopass.type = 'lowpass';
  lopass.frequency.value = 800;
  lopass.Q.value = 0.3;

  const lopass2 = ctx.createBiquadFilter();
  lopass2.type = 'peaking';
  lopass2.frequency.value = 200;
  lopass2.gain.value = 6;

  const gain = ctx.createGain();
  gain.gain.value = 0.55;

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.15;
  lfo.type = 'sine';
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.07;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  lfo.start();

  src.connect(lopass);
  lopass.connect(lopass2);
  lopass2.connect(gain);
  gain.connect(masterGain);
  src.start();

  return () => {
    try { src.stop(); src.disconnect(); } catch {}
    try { lfo.stop(); } catch {}
    try { gain.disconnect(); lopass.disconnect(); lopass2.disconnect(); } catch {}
  };
}

function createCatPurr(ctx: AudioContext, masterGain: GainNode): () => void {
  // Cat purring: ~25Hz base frequency with harmonics
  const nodes: OscillatorNode[] = [];
  const gains: GainNode[] = [];

  const baseFreq = 26;
  const harmonics = [1, 2, 3, 4, 6, 8];
  const amps = [0.4, 0.25, 0.15, 0.1, 0.06, 0.04];

  const masterLocal = ctx.createGain();
  masterLocal.gain.value = 0.35;

  // Purr LFO — the "inhale/exhale" rhythm
  const purrLfo = ctx.createOscillator();
  purrLfo.type = 'sine';
  purrLfo.frequency.value = 0.4; // ~24 breaths/min
  const purrLfoGain = ctx.createGain();
  purrLfoGain.gain.value = 0.2;
  purrLfo.connect(purrLfoGain);
  purrLfoGain.connect(masterLocal.gain);
  purrLfo.start();

  const lopass = ctx.createBiquadFilter();
  lopass.type = 'lowpass';
  lopass.frequency.value = 400;
  lopass.Q.value = 1.5;

  harmonics.forEach((h, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = baseFreq * h;
    const g = ctx.createGain();
    g.gain.value = amps[i];
    osc.connect(g);
    g.connect(lopass);
    osc.start();
    nodes.push(osc);
    gains.push(g);
  });

  lopass.connect(masterLocal);
  masterLocal.connect(masterGain);

  return () => {
    try { purrLfo.stop(); } catch {}
    nodes.forEach(n => { try { n.stop(); n.disconnect(); } catch {} });
    gains.forEach(g => { try { g.disconnect(); } catch {} });
    try { lopass.disconnect(); masterLocal.disconnect(); } catch {}
  };
}

// Healing singing-bowl chime: 3 layered partials with exponential decay
function playChimeOnContext(ctx: AudioContext): void {
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 0.55;
  out.connect(ctx.destination);

  // Partials: frequencies, amplitudes, decay times
  const partials: [number, number, number][] = [
    [528,  0.8, 2.4],   // root (healing "Mi" tone)
    [1056, 0.4, 1.6],   // octave
    [1848, 0.2, 1.0],   // major 7th overtone
    [2376, 0.1, 0.6],   // sparkle
  ];

  partials.forEach(([freq, amp, decay]) => {
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    // Attack + exponential release
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(amp, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + decay);

    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + decay + 0.05);
  });

  // Clean up gain node after longest decay
  setTimeout(() => { try { out.disconnect(); } catch {} }, 2800);
}

export function createAudioEngine(): AudioEngine {
  let ctx: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let currentCleanup: (() => void) | null = null;

  function ensureContext() {
    if (!ctx || ctx.state === 'closed') {
      ctx = new AudioContext();
      masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return { ctx, masterGain: masterGain! };
  }

  return {
    setSound(type: SoundType, volume: number) {
      if (currentCleanup) { currentCleanup(); currentCleanup = null; }
      if (type === 'none') return;

      const { ctx: c, masterGain: mg } = ensureContext();
      mg.gain.value = volume;

      if (type === 'rain') currentCleanup = createRainSound(c, mg);
      else if (type === 'fire') currentCleanup = createFireSound(c, mg);
      else if (type === 'cat') currentCleanup = createCatPurr(c, mg);
    },
    setVolume(volume: number) {
      if (masterGain) masterGain.gain.value = volume;
    },
    stop() {
      if (currentCleanup) { currentCleanup(); currentCleanup = null; }
    },
    playChime() {
      const { ctx: c } = ensureContext();
      playChimeOnContext(c);
    },
  };
}
