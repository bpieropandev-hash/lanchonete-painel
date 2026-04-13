let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

export function unlockAudio(): void {
  const ctx = getContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => undefined);
  }
}

export function playNotification(): void {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => undefined);
  }

  const now = ctx.currentTime;
  const beep = (start: number, freq: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.3, start + 0.01);
    gain.gain.linearRampToValueAtTime(0, start + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.2);
  };

  beep(now, 880);
  beep(now + 0.22, 1175);
  beep(now + 0.44, 1480);
}
