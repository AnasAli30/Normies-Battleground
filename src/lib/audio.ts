class AudioSystem {
  private ctx: AudioContext | null = null;
  public enabled = true;
  public volume = 0.3;

  private _ensureContext() {
    if (typeof window === 'undefined') return;
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  public playHit() {
    if (!this.enabled) return;
    this._ensureContext();
    this._playTone(200, 0.1, 'sawtooth', 0.2);
    setTimeout(() => this._playTone(150, 0.05, 'square', 0.15), 50);
  }

  public playCrit() {
    if (!this.enabled) return;
    this._ensureContext();
    this._playTone(400, 0.05, 'sawtooth', 0.3);
    setTimeout(() => this._playTone(600, 0.08, 'square', 0.25), 30);
    setTimeout(() => this._playTone(300, 0.1, 'sawtooth', 0.2), 80);
  }

  public playHeal() {
    if (!this.enabled) return;
    this._ensureContext();
    this._playTone(400, 0.15, 'sine', 0.2);
    setTimeout(() => this._playTone(500, 0.15, 'sine', 0.15), 100);
    setTimeout(() => this._playTone(600, 0.2, 'sine', 0.1), 200);
  }

  public playBuff() {
    if (!this.enabled) return;
    this._ensureContext();
    this._playTone(300, 0.1, 'triangle', 0.2);
    setTimeout(() => this._playTone(450, 0.15, 'triangle', 0.15), 80);
  }

  public playSelect() {
    if (!this.enabled) return;
    this._ensureContext();
    this._playTone(500, 0.05, 'square', 0.1);
  }

  public playVictory() {
    if (!this.enabled) return;
    this._ensureContext();
    [400, 500, 600, 800].forEach((freq, i) => {
      setTimeout(() => this._playTone(freq, 0.2, 'square', 0.2), i * 150);
    });
  }

  public playDefeat() {
    if (!this.enabled) return;
    this._ensureContext();
    [400, 350, 300, 200].forEach((freq, i) => {
      setTimeout(() => this._playTone(freq, 0.25, 'sawtooth', 0.15), i * 200);
    });
  }

  public playPerfect() {
    if (!this.enabled) return;
    this._ensureContext();
    this._playTone(800, 0.08, 'sine', 0.25);
    setTimeout(() => this._playTone(1000, 0.1, 'sine', 0.2), 50);
    setTimeout(() => this._playTone(1200, 0.15, 'sine', 0.15), 100);
  }

  public playCriticalPerfect() {
    if (!this.enabled) return;
    this._ensureContext();
    this._playTone(600, 0.05, 'square', 0.3);
    setTimeout(() => this._playTone(900, 0.08, 'sine', 0.25), 40);
    setTimeout(() => this._playTone(1200, 0.1, 'sine', 0.2), 80);
    setTimeout(() => this._playTone(1500, 0.15, 'sine', 0.15), 120);
  }

  public playMiss() {
    if (!this.enabled) return;
    this._ensureContext();
    this._playTone(120, 0.15, 'sawtooth', 0.15);
    setTimeout(() => this._playTone(100, 0.1, 'sawtooth', 0.1), 60);
  }

  public playDodge() {
    if (!this.enabled) return;
    this._ensureContext();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15 * this.volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch (e) {
      // ignore errors
    }
  }

  public playDodgeFail() {
    if (!this.enabled) return;
    this._ensureContext();
    this._playTone(80, 0.1, 'sawtooth', 0.2);
    this._playTone(60, 0.15, 'square', 0.15);
  }

  public playCombo(comboCount: number) {
    if (!this.enabled) return;
    this._ensureContext();
    const baseFreq = 400 + comboCount * 80;
    this._playTone(baseFreq, 0.06, 'square', 0.15);
  }

  public playPixelCrunch() {
    if (!this.enabled) return;
    this._ensureContext();
    for (let i = 0; i < 3; i++) {
      const freq = 60 + Math.random() * 200;
      setTimeout(() => this._playTone(freq, 0.04, 'sawtooth', 0.08), i * 15);
    }
  }

  public playTimingTick() {
    if (!this.enabled) return;
    this._ensureContext();
    this._playTone(600, 0.02, 'square', 0.05);
  }

  private _playTone(freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.2) {
    this._ensureContext();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = vol * this.volume;
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // ignore oscillator state errors
    }
  }
}

export const audio = new AudioSystem();
export default audio;
