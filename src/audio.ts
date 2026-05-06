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
  // Redesigned: gentle warm drone + soft noise bed — cozy, not scary
  const masterLocal = ctx.createGain();
  masterLocal.gain.value = 0.28;
  masterLocal.connect(masterGain);

  // Warm sine tones at comfortable mid-frequencies (like a cat's resonance through fur)
  const drones: OscillatorNode[] = [];
  const droneGains: GainNode[] = [];
  const droneFreqs = [130, 195, 260]; // C3, G3, C4 — warm, cozy chord
  const droneAmps  = [0.30, 0.18, 0.10];

  const lopass = ctx.createBiquadFilter();
  lopass.type = 'lowpass';
  lopass.frequency.value = 320;
  lopass.Q.value = 0.5;
  lopass.connect(masterLocal);

  droneFreqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = droneAmps[i];
    osc.connect(g);
    g.connect(lopass);
    osc.start();
    drones.push(osc);
    droneGains.push(g);
  });

  // Soft noise texture (very quiet — adds warmth, not harshness)
  const noiseSize = ctx.sampleRate * 2;
  const noiseBuffer = ctx.createBuffer(1, noiseSize, ctx.sampleRate);
  const nd = noiseBuffer.getChannelData(0);
  let nb0 = 0, nb1 = 0, nb2 = 0;
  for (let i = 0; i < noiseSize; i++) {
    const w = Math.random() * 2 - 1;
    nb0 = 0.99 * nb0 + w * 0.02; nb1 = 0.97 * nb1 + w * 0.04; nb2 = 0.90 * nb2 + w * 0.06;
    nd[i] = (nb0 + nb1 + nb2) * 0.18;
  }
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuffer;
  noiseSrc.loop = true;
  const noiseLP = ctx.createBiquadFilter();
  noiseLP.type = 'lowpass';
  noiseLP.frequency.value = 180;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.12;
  noiseSrc.connect(noiseLP);
  noiseLP.connect(noiseGain);
  noiseGain.connect(masterLocal);
  noiseSrc.start();

  // Slow, very smooth LFO — gentle "breathing" amplitude swell (~0.25 Hz)
  const breathLfo = ctx.createOscillator();
  breathLfo.type = 'sine';
  breathLfo.frequency.value = 0.25;
  const breathGain = ctx.createGain();
  breathGain.gain.value = 0.07; // subtle swell, not dramatic
  breathLfo.connect(breathGain);
  breathGain.connect(masterLocal.gain);
  breathLfo.start();

  return () => {
    try { breathLfo.stop(); } catch {}
    try { noiseSrc.stop(); } catch {}
    drones.forEach(d => { try { d.stop(); d.disconnect(); } catch {} });
    droneGains.forEach(g => { try { g.disconnect(); } catch {} });
    try { lopass.disconnect(); noiseLP.disconnect(); noiseGain.disconnect(); } catch {}
    try { masterLocal.disconnect(); } catch {}
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
