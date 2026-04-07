export class SoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.masterGain = null;
    }

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.ctx.destination);
        } catch (e) {
            this.enabled = false;
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    playNoise(duration, frequency, filterFreq, filterType = 'bandpass', volume = 0.15) {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;

        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.value = filterFreq;
        filter.Q.value = 1;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        source.start(now);
        source.stop(now + duration);
    }

    playTone(frequency, duration, type = 'sine', volume = 0.1) {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, now);
        osc.frequency.exponentialRampToValueAtTime(frequency * 0.5, now + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + duration);
    }

    breakBlock(blockType) {
        this.playNoise(0.15, 0, 800 + Math.random() * 400, 'highpass', 0.12);
        this.playTone(150 + Math.random() * 100, 0.1, 'square', 0.05);
    }

    placeBlock() {
        this.playNoise(0.1, 0, 2000, 'lowpass', 0.1);
        this.playTone(300, 0.08, 'square', 0.04);
    }

    footstep() {
        this.playNoise(0.08, 0, 400 + Math.random() * 200, 'lowpass', 0.06);
    }

    jump() {
        this.playTone(200, 0.1, 'sine', 0.05);
    }

    land() {
        this.playNoise(0.12, 0, 300, 'lowpass', 0.08);
    }
}
