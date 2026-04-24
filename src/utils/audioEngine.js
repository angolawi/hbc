
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.noiseNode = null;
    this.filterNode = null;
    this.gainNode = null;
    this.binauralNodes = [];
    this.currentType = null; // 'white', 'brown', 'beta', 'rain'
    this.volume = 0.5;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.gainNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(val) {
    this.volume = val;
    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(val, this.ctx.currentTime, 0.1);
    }
  }

  stop() {
    if (this.noiseNode) {
      this.noiseNode.stop();
      this.noiseNode.disconnect();
      this.noiseNode = null;
    }
    if (this.filterNode) {
      this.filterNode.disconnect();
      this.filterNode = null;
    }
    if (this.binauralNodes.length) {
      this.binauralNodes.forEach(node => {
        node.stop();
        node.disconnect();
      });
      this.binauralNodes = [];
    }
    this.currentType = null;
  }

  playWhiteNoise() {
    this.init();
    this.stop();
    
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    // Modified to be Pink-ish Noise Base
    let b0, b1, b2, b3, b4, b5, b6;
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11;
      b6 = white * 0.115926;
    }

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;

    // Filter white noise to make it less screechy (approx. pink noise)
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(3500, this.ctx.currentTime);
    this.filterNode.Q.setValueAtTime(0.5, this.ctx.currentTime);

    // Subtle LFO for air movement feel
    const airLfo = this.ctx.createOscillator();
    airLfo.frequency.setValueAtTime(0.05, this.ctx.currentTime);
    const airGain = this.ctx.createGain();
    airGain.gain.setValueAtTime(500, this.ctx.currentTime);
    airLfo.connect(airGain);
    airGain.connect(this.filterNode.frequency);
    airLfo.start();

    this.noiseNode.connect(this.filterNode).connect(this.gainNode);
    this.noiseNode.start();
    this.binauralNodes = [airLfo];
    this.currentType = 'white';
  }

  playBrownNoise() {
    this.init();
    this.stop();

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // (roughly) compensate for gain loss
    }

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;
    this.noiseNode.connect(this.gainNode);
    this.noiseNode.start();
    this.currentType = 'brown';
  }

  playBetaWaves() {
    this.init();
    this.stop();

    const baseFreq = 200;
    const beatFreq = 15; // Beta range (13-30Hz)

    const oscLeft = this.ctx.createOscillator();
    const oscRight = this.ctx.createOscillator();
    const panLeft = this.ctx.createStereoPanner();
    const panRight = this.ctx.createStereoPanner();

    oscLeft.frequency.value = baseFreq;
    oscRight.frequency.value = baseFreq + beatFreq;

    panLeft.pan.value = -1;
    panRight.pan.value = 1;

    oscLeft.connect(panLeft).connect(this.gainNode);
    oscRight.connect(panRight).connect(this.gainNode);

    oscLeft.start();
    oscRight.start();

    this.binauralNodes = [oscLeft, oscRight];
    this.currentType = 'beta';
  }

  playRainNoise() {
    this.init();
    this.stop();

    const bufferSize = 2 * this.ctx.sampleRate;
    
    // LAYER 1: Deep Rumble (Brownian)
    const rumbleBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const rumbleData = rumbleBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      rumbleData[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = rumbleData[i];
      rumbleData[i] *= 3.5;
    }

    const rumbleNode = this.ctx.createBufferSource();
    rumbleNode.buffer = rumbleBuffer;
    rumbleNode.loop = true;

    const rumbleFilter = this.ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.setValueAtTime(600, this.ctx.currentTime);

    // LAYER 2: Surface Patter (Filtered Pink)
    const patterBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const patterData = patterBuffer.getChannelData(0);
    let b0, b1, b2, b3, b4, b5, b6;
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      patterData[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      patterData[i] *= 0.11;
      b6 = white * 0.115926;
    }

    const patterNode = this.ctx.createBufferSource();
    patterNode.buffer = patterBuffer;
    patterNode.loop = true;

    const patterFilter = this.ctx.createBiquadFilter();
    patterFilter.type = 'bandpass';
    patterFilter.frequency.setValueAtTime(2500, this.ctx.currentTime);
    patterFilter.Q.setValueAtTime(0.8, this.ctx.currentTime);

    // Modulation for Movement
    const windLfo = this.ctx.createOscillator();
    windLfo.frequency.setValueAtTime(0.07, this.ctx.currentTime);
    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    windLfo.connect(windGain);

    const rainMaster = this.ctx.createGain();
    rainMaster.gain.setValueAtTime(0.6, this.ctx.currentTime);
    windGain.connect(rainMaster.gain);

    // Routing
    rumbleNode.connect(rumbleFilter).connect(rainMaster);
    patterNode.connect(patterFilter).connect(rainMaster);
    rainMaster.connect(this.gainNode);

    // Start all
    rumbleNode.start();
    patterNode.start();
    windLfo.start();

    this.noiseNode = rumbleNode; // Primary for stop
    this.binauralNodes = [patterNode, windLfo]; // Others for stop
    this.currentType = 'rain';
  }
}

export const audioEngine = new AudioEngine();
