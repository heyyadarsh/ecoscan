// All sounds generated via Web Audio API — zero external files or dependencies

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
}

// ── Tiny helper: single oscillator note ─────────────────────────────────────
function tone(
  ac: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  volume = 0.12,
  type: OscillatorType = 'sine',
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + startOffset);
  gain.gain.setValueAtTime(0, ac.currentTime + startOffset);
  gain.gain.linearRampToValueAtTime(volume, ac.currentTime + startOffset + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + startOffset + duration);
  osc.start(ac.currentTime + startOffset);
  osc.stop(ac.currentTime + startOffset + duration + 0.02);
}

// ── Nav tap — soft high "tock" ───────────────────────────────────────────────
export function playNavClick() {
  const ac = ctx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1000, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(500, ac.currentTime + 0.07);
  gain.gain.setValueAtTime(0.07, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.09);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.1);
}

// ── Scan start — rising futuristic sweep ─────────────────────────────────────
export function playScanStart() {
  const ac = ctx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(280, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1100, ac.currentTime + 0.4);
  gain.gain.setValueAtTime(0, ac.currentTime);
  gain.gain.linearRampToValueAtTime(0.13, ac.currentTime + 0.05);
  gain.gain.setValueAtTime(0.13, ac.currentTime + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.42);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.44);
}

// ── Scan success — three-note ascending chime (C5 → E5 → G5) ─────────────────
export function playScanSuccess() {
  const ac = ctx();
  if (!ac) return;
  tone(ac, 523, 0,    0.22, 0.13);   // C5
  tone(ac, 659, 0.16, 0.22, 0.13);   // E5
  tone(ac, 784, 0.30, 0.32, 0.15);   // G5
}

// ── Error / blocked — low descending double-beep ────────────────────────────
export function playError() {
  const ac = ctx();
  if (!ac) return;
  tone(ac, 320, 0,    0.15, 0.1, 'square');
  tone(ac, 220, 0.18, 0.18, 0.1, 'square');
}
