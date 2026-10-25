/** Retro chiptune ovoz effektlari — Web Audio API, tashqi fayl kerak emas. */
class SoundFX {
  private ctx: AudioContext | null = null;
  muted = false;

  /** Brauzer ruxsati uchun: birinchi foydalanuvchi bosishida chaqiriladi. */
  unlock() {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return;
      }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  /** Pauza: barcha ovozni to'xtatadi. */
  suspend() {
    if (this.ctx && this.ctx.state === "running") void this.ctx.suspend();
  }

  /** Pauzadan chiqish: ovozni qaytaradi. */
  resume() {
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0) {
    if (this.muted || !this.ctx || this.ctx.state !== "running") return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  }

  /** Qisqa "vush" — hujum */
  attack() {
    this.tone(700, 0.09, "square", 0.06, 180);
  }

  /** Past "pak" — zarba tegganda */
  hit() {
    this.tone(160, 0.08, "square", 0.09, 70);
  }

  /** Pasayuvchi ohang — o'lim */
  death() {
    this.tone(400, 0.5, "sawtooth", 0.08, 50);
    this.tone(300, 0.5, "square", 0.05, 40, 0.1);
  }

  /** G'alaba melodiyasi */
  victory() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this.tone(f, 0.16, "square", 0.07, undefined, i * 0.15));
    this.tone(1319, 0.4, "square", 0.07, undefined, notes.length * 0.15);
  }
}

export const sfx = new SoundFX();
