class Metronome {
    constructor() {
        this.audioContext = null;
        this.masterGainNode = null;
        this.isPlaying = false;
        this.current16thNote = 0;
        this.tempo = 120.0;
        this.lookahead = 25.0;
        this.scheduleAheadTime = 0.1;
        this.nextNoteTime = 0.0;
        this.timerID = null;

        // Sequence/Logic state
        this.notesInQueue = [];

        // Settings
        this.timeSignature = [4, 4];
        this.grouping = []; // For complex accents e.g., [2,2,2,3]
        this.precountBars = 0;
        this.volume = 1.0;

        // Sequence Mode
        this.mode = 'simple';
        this.sequence = [];
        this.currentSequenceStepIndex = 0;
        this.barsPlayedInCurrentStep = 0;
        this.totalBarsInCurrentStep = 0;
        this.isFermata = false;
        this.fermataEndTime = 0;

        // Sequence Interpolation
        this.stepStartTempo = 120;
        this.stepEndTempo = 120;

        // UI references
        this.ui = {
            playBtn: document.getElementById('play-btn'),
            bpmDisplay: document.getElementById('bpm-display'),
            bpmSlider: document.getElementById('bpm-slider'),
            beatVisual: document.getElementById('beat-visual'),
            beatCounter: document.getElementById('beat-counter'),
            volumeSlider: document.getElementById('volume-slider'),
            precountInput: document.getElementById('precount-bars'),
            modeBtns: {
                simple: document.getElementById('mode-simple'),
                sequence: document.getElementById('mode-sequence')
            },
            sections: {
                simple: document.getElementById('simple-controls'),
                sequence: document.getElementById('sequence-controls')
            }
        };

        // Conductor Visuals
        this.canvas = document.getElementById('conductor-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.init();
    }

    resizeCanvas() {
        if (!this.canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
    }

    init() {
        if (this.ui.playBtn) this.ui.playBtn.addEventListener('click', () => this.togglePlay());

        // BPM Controls
        if (this.ui.bpmSlider) {
            this.ui.bpmSlider.addEventListener('input', (e) => this.changeTempo(e.target.value));
            document.getElementById('tempo-minus').addEventListener('click', () => this.changeTempo(this.tempo - 1));
            document.getElementById('tempo-plus').addEventListener('click', () => this.changeTempo(this.tempo + 1));
        }

        // Settings
        const timeSig = document.getElementById('time-signature');
        if (timeSig) timeSig.addEventListener('change', (e) => this.setTimeSignature(e.target.value));

        // Volume
        if (this.ui.volumeSlider) {
            this.ui.volumeSlider.addEventListener('input', (e) => {
                this.volume = (e.target.value / 100) * 2.5;
                if (this.masterGainNode) this.masterGainNode.gain.value = this.volume;
            });
        }

        // Precount
        if (this.ui.precountInput) {
            this.ui.precountInput.addEventListener('change', (e) => {
                this.precountBars = parseInt(e.target.value);
                if (this.precountBars < 0) this.precountBars = 0;
            });
        }

        // Mode Switching
        if (this.ui.modeBtns.simple) {
            this.ui.modeBtns.simple.addEventListener('click', () => this.setMode('simple'));
            this.ui.modeBtns.sequence.addEventListener('click', () => this.setMode('sequence'));
        }

        // Sequence Controls
        const addStepBtn = document.getElementById('add-step-btn');
        if (addStepBtn) addStepBtn.addEventListener('click', () => this.addSequenceStep());

        // Audio Context interaction
        ['click', 'touchstart'].forEach(e => {
            document.addEventListener(e, () => {
                if (!this.audioContext) this.initAudio();
                if (this.audioContext.state === 'suspended') this.audioContext.resume();
            }, { once: true });
        });

        requestAnimationFrame(this.draw.bind(this));
    }

    initAudio() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGainNode = this.audioContext.createGain();

        let sliderVal = this.ui.volumeSlider ? this.ui.volumeSlider.value : 200;
        this.volume = (sliderVal / 100) * 5.0;

        this.masterGainNode.gain.value = this.volume;
        this.masterGainNode.connect(this.audioContext.destination);
    }

    changeTempo(val) {
        let newTempo = parseInt(val);
        if (newTempo < 30) newTempo = 30;
        if (newTempo > 300) newTempo = 300;

        this.tempo = newTempo;
        if (this.ui.bpmDisplay) this.ui.bpmDisplay.textContent = this.tempo;
        if (this.ui.bpmSlider) this.ui.bpmSlider.value = this.tempo;
    }

    setTimeSignature(val) {
        this.grouping = [];
        if (val === '9/8-2223') {
            this.timeSignature = [9, 8];
            this.grouping = [2, 2, 2, 3];
        } else if (val === '9/8-2322') {
            this.timeSignature = [9, 8];
            this.grouping = [2, 3, 2, 2];
        } else if (val === '6/8+3/4') {
            this.timeSignature = [12, 8];
            this.grouping = [3, 3, 2, 2, 2];
        } else {
            const parts = val.split('/');
            this.timeSignature = [parseInt(parts[0]), parseInt(parts[1])];
        }
    }

    setMode(mode) {
        this.mode = mode;
        this.ui.modeBtns.simple.classList.toggle('active', mode === 'simple');
        this.ui.modeBtns.sequence.classList.toggle('active', mode === 'sequence');
        this.ui.sections.simple.classList.toggle('hidden', mode !== 'simple');
        this.ui.sections.sequence.classList.toggle('hidden', mode !== 'sequence');

        if (this.isPlaying) this.stop();
    }

    togglePlay() {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.start();
        }
    }

    start() {
        if (!this.audioContext) this.initAudio();

        this.isPlaying = true;
        this.ui.playBtn.classList.add('playing');
        this.isFermata = false;

        // Focus Mode Toggle
        const focusToggle = document.getElementById('focus-mode-toggle');
        if (focusToggle && focusToggle.checked) {
            document.body.classList.add('focus-active');
        }

        this.current16thNote = 0;
        this.nextNoteTime = this.audioContext.currentTime;

        this.currentSequenceStepIndex = 0;
        this.barsPlayedInCurrentStep = 0;

        if (this.mode === 'sequence') {
            this.loadStep(0);
            const status = document.getElementById('seq-status');
            if (status) status.style.display = 'block';
        } else {
            if (this.precountBars > 0) {
                this.barsPlayedInCurrentStep = -this.precountBars;
            } else {
                this.barsPlayedInCurrentStep = 0;
            }
        }

        this.timerID = setInterval(() => this.scheduler(), this.lookahead);
    }

    stop() {
        this.isPlaying = false;
        this.ui.playBtn.classList.remove('playing');

        // Remove Focus Mode
        document.body.classList.remove('focus-active');

        clearInterval(this.timerID);
        const status = document.getElementById('seq-status');
        if (status) status.style.display = 'none';
        this.ui.beatCounter.textContent = '1';
        this.ui.beatCounter.classList.remove('active');
    }

    scheduler() {
        if (this.isFermata) {
            if (this.audioContext.currentTime >= this.fermataEndTime) {
                this.isFermata = false;
                this.nextNoteTime = this.audioContext.currentTime + 0.1;
                this.finishSequenceStep();
            }
            return;
        }

        while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.current16thNote, this.nextNoteTime);
            this.nextNote();
        }
    }

    nextNote() {
        let currentInstantTempo = this.tempo;

        if (this.mode === 'sequence' && this.stepStartTempo !== this.stepEndTempo && this.barsPlayedInCurrentStep >= 0) {
            const progress = (this.barsPlayedInCurrentStep + (this.current16thNote / 16)) / this.totalBarsInCurrentStep;
            let p = progress;
            if (p < 0) p = 0; if (p > 1) p = 1;

            currentInstantTempo = this.stepStartTempo + (this.stepEndTempo - this.stepStartTempo) * p;
            if (this.current16thNote === 0 && this.ui.bpmDisplay) {
                this.ui.bpmDisplay.textContent = Math.round(currentInstantTempo);
            }
        }

        const secondsPerBeat = 60.0 / currentInstantTempo;
        this.nextNoteTime += 0.25 * secondsPerBeat;

        this.current16thNote++;
        const notesPerMeasure = this.timeSignature[0] * (16 / this.timeSignature[1]);

        if (this.current16thNote >= notesPerMeasure) {
            this.current16thNote = 0;
            this.handleMeasureBoundary();
        }
    }

    handleMeasureBoundary() {
        if (this.mode === 'sequence') {
            this.barsPlayedInCurrentStep++;
            if (this.barsPlayedInCurrentStep >= this.totalBarsInCurrentStep) {
                this.finishSequenceStep();
            } else {
                this.updateSequenceState();
            }
        } else {
            if (this.barsPlayedInCurrentStep < 0) {
                this.barsPlayedInCurrentStep++;
            }
        }
    }

    finishSequenceStep() {
        this.currentSequenceStepIndex++;
        if (this.currentSequenceStepIndex >= this.sequence.length) {
            if (document.getElementById('sequence-loop').checked) {
                this.currentSequenceStepIndex = 0;
                this.loadStep(0);
            } else {
                this.stop();
                return;
            }
        } else {
            this.loadStep(this.currentSequenceStepIndex);
        }
    }

    updateSequenceState() {
        document.getElementById('seq-current-bar').textContent = this.barsPlayedInCurrentStep + 1;
    }

    loadStep(index) {
        const step = this.sequence[index];
        if (!step) return;

        if (step.type === 'fermata') {
            this.isFermata = true;
            this.fermataEndTime = this.audioContext.currentTime + (step.duration || 2.0);
            document.getElementById('seq-current-step').textContent = index + 1 + " (Fermata)";
            document.getElementById('seq-current-bar').textContent = "-";
            document.getElementById('seq-total-bars').textContent = "-";
            return;
        }

        this.stepStartTempo = step.bpmStart;
        this.stepEndTempo = step.bpmEnd;
        this.tempo = this.stepStartTempo;

        this.setTimeSignature(step.signature);
        this.totalBarsInCurrentStep = step.bars;
        this.barsPlayedInCurrentStep = 0;

        if (this.ui.bpmDisplay) this.ui.bpmDisplay.textContent = Math.round(this.tempo);
        document.getElementById('seq-current-bar').textContent = 1;
        document.getElementById('seq-total-bars').textContent = step.bars;
        document.getElementById('seq-current-step').textContent = index + 1;
    }

    scheduleNote(beatNumber, time) {
        const sixteenthsPerBeat = 16 / this.timeSignature[1];

        if (beatNumber % sixteenthsPerBeat === 0) {
            const beatIndex = beatNumber / sixteenthsPerBeat;

            this.notesInQueue.push({ note: beatIndex, time: time });

            const osc = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            osc.connect(gainNode);
            if (this.masterGainNode) gainNode.connect(this.masterGainNode);

            // Triangle wave cuts through better than sine
            osc.type = 'triangle';

            let isAccented = (beatIndex === 0);
            let freq = 800;

            if (this.grouping.length > 0) {
                // Custom Grouping Logic
                let sum = 0;
                let groupIndex = -1;
                for (let i = 0; i < this.grouping.length; i++) {
                    if (beatIndex === sum) {
                        groupIndex = i;
                        break;
                    }
                    sum += this.grouping[i];
                }

                if (groupIndex !== -1) {
                    isAccented = true;
                    if (beatIndex === 0) freq = 1200;
                    else freq = 1000;
                }
            } else {
                // Standard Logic
                if (this.timeSignature[0] === 6 && this.timeSignature[1] === 8) {
                    if (beatIndex === 3) isAccented = true;
                    if (beatIndex === 0) freq = 1200;
                    else if (beatIndex === 3) freq = 1000;
                } else if (this.timeSignature[0] === 5 && this.timeSignature[1] === 8) {
                    if (beatIndex === 0) freq = 1200;
                    else if (beatIndex === 3) freq = 1000;
                } else if (this.timeSignature[0] === 1 && this.timeSignature[1] === 4) {
                    isAccented = true;
                    freq = 1200;
                } else {
                    if (isAccented) freq = 1200;
                }
            }

            if (this.barsPlayedInCurrentStep < 0) {
                freq = 600;
            }

            osc.frequency.value = freq;
            gainNode.gain.value = 1;
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

            osc.start(time);
            osc.stop(time + 0.1);
        }
    }

    draw() {
        let currentNote = this.lastNoteDrawn;
        const currentTime = this.audioContext?.currentTime;

        while (this.notesInQueue.length && this.notesInQueue[0].time < currentTime) {
            currentNote = this.notesInQueue[0];
            this.notesInQueue.splice(0, 1);
            this.updateVisuals(currentNote.note);
        }

        this.drawAnimation();
        requestAnimationFrame(this.draw.bind(this));
    }

    drawAnimation() {
        if (!this.audioContext || !this.isPlaying || this.isFermata) {
            if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width / window.devicePixelRatio, this.canvas.height / window.devicePixelRatio);
            return;
        }

        const w = 300;
        const h = 200;
        this.ctx.clearRect(0, 0, w, h);

        const secondsPerBeat = 60.0 / this.tempo;
        let timeToNextBeat = this.nextNoteTime - this.audioContext.currentTime;
        let p = 1 - (timeToNextBeat / secondsPerBeat);
        if (p < 0) p = 0; if (p > 1) p = 1;

        const sixteenthsPerBeat = 16 / this.timeSignature[1];
        let currentBeatIndex = Math.floor((this.current16thNote / sixteenthsPerBeat) - 1);
        if (currentBeatIndex < 0) {
            const notesPerMeasure = this.timeSignature[0] * sixteenthsPerBeat;
            currentBeatIndex = (notesPerMeasure / sixteenthsPerBeat) - 1;
        }

        let beat = currentBeatIndex;
        let sig = this.timeSignature[0];
        if (beat < 0 || isNaN(beat)) beat = 0;
        if (beat >= sig) beat = beat % sig;

        let start = { x: 0.5, y: 0.5 };
        let end = { x: 0.5, y: 0.5 };

        // Complex trajectories fallback
        if (this.grouping.length > 0) {
            const angleStart = (beat / sig) * Math.PI * 2 - Math.PI / 2;
            const angleEnd = ((beat + 1) / sig) * Math.PI * 2 - Math.PI / 2;
            start = { x: 0.5 + Math.cos(angleStart) * 0.3, y: 0.5 + Math.sin(angleStart) * 0.3 };
            end = { x: 0.5 + Math.cos(angleEnd) * 0.3, y: 0.5 + Math.sin(angleEnd) * 0.3 };
        } else if (sig === 4) {
            if (beat === 0) { start = { x: 0.5, y: 0.2 }; end = { x: 0.5, y: 0.8 }; }
            else if (beat === 1) { start = { x: 0.5, y: 0.8 }; end = { x: 0.2, y: 0.5 }; }
            else if (beat === 2) { start = { x: 0.2, y: 0.5 }; end = { x: 0.8, y: 0.5 }; }
            else { start = { x: 0.8, y: 0.5 }; end = { x: 0.5, y: 0.2 }; }
        }
        else if (sig === 3) {
            if (beat === 0) { start = { x: 0.5, y: 0.2 }; end = { x: 0.5, y: 0.8 }; }
            else if (beat === 1) { start = { x: 0.5, y: 0.8 }; end = { x: 0.8, y: 0.4 }; }
            else { start = { x: 0.8, y: 0.4 }; end = { x: 0.5, y: 0.2 }; }
        }
        else if (sig === 2) {
            if (beat === 0) { start = { x: 0.4, y: 0.2 }; end = { x: 0.6, y: 0.8 }; }
            else { start = { x: 0.6, y: 0.8 }; end = { x: 0.4, y: 0.2 }; }
        }
        else {
            const angleStart = (beat / sig) * Math.PI * 2 - Math.PI / 2;
            const angleEnd = ((beat + 1) / sig) * Math.PI * 2 - Math.PI / 2;
            start = { x: 0.5 + Math.cos(angleStart) * 0.3, y: 0.5 + Math.sin(angleStart) * 0.3 };
            end = { x: 0.5 + Math.cos(angleEnd) * 0.3, y: 0.5 + Math.sin(angleEnd) * 0.3 };
        }

        const ease = t => -(Math.cos(Math.PI * t) - 1) / 2;
        const val = ease(p);
        const curX = start.x + (end.x - start.x) * val;
        const curY = start.y + (end.y - start.y) * val;

        if (p < 0.9) {
            const grad = this.ctx.createLinearGradient(start.x * 300, start.y * 200, curX * 300, curY * 200);
            grad.addColorStop(0, "rgba(56, 189, 248, 0)");
            grad.addColorStop(1, "rgba(56, 189, 248, 0.6)");
            this.ctx.beginPath();
            this.ctx.moveTo(start.x * 300, start.y * 200);
            this.ctx.lineTo(curX * 300, curY * 200);
            this.ctx.lineWidth = 4;
            this.ctx.strokeStyle = grad;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();
        }

        this.ctx.beginPath();
        this.ctx.arc(curX * 300, curY * 200, 8, 0, Math.PI * 2);
        this.ctx.fillStyle = '#38bdf8';
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#38bdf8';
        this.ctx.fill();
    }

    updateVisuals(beatIndex) {
        const beatNum = beatIndex + 1;
        this.ui.beatCounter.textContent = beatNum;
        if (this.barsPlayedInCurrentStep < 0) {
            this.ui.beatCounter.style.color = '#ef4444';
        } else {
            this.ui.beatCounter.style.color = '';
        }

        const isDownbeat = (beatIndex === 0);
        this.ui.beatVisual.classList.add('active');
        if (isDownbeat) this.ui.beatVisual.classList.add('downbeat');
        setTimeout(() => {
            this.ui.beatVisual.classList.remove('active');
            this.ui.beatVisual.classList.remove('downbeat');
        }, 100);
    }

    addSequenceStep() {
        const list = document.getElementById('sequence-list');
        if (list.querySelector('.empty-state')) list.innerHTML = '';

        const template = document.getElementById('step-template');
        const clone = template.content.cloneNode(true);
        const div = clone.querySelector('.sequence-step');

        list.appendChild(div);
        this.updateStepNumbers();
        this.syncSequenceFromDOM();

        // Listeners
        const inputs = div.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                // Formatting UI
                if (input.classList.contains('step-type-select')) {
                    const isFermata = (input.value === 'fermata');
                    div.querySelector('.type-normal').style.display = isFermata ? 'none' : 'grid';
                    div.querySelector('.type-fermata').style.display = isFermata ? 'block' : 'none';
                }
                if (input.classList.contains('step-ramp-toggle')) {
                    const isRamp = input.checked;
                    div.querySelector('.ramp-end-group').style.display = isRamp ? 'block' : 'none';
                }
                this.syncSequenceFromDOM();
            });
        });

        div.querySelector('.remove-step').addEventListener('click', () => {
            div.remove();
            this.syncSequenceFromDOM();
            this.updateStepNumbers();
        });
    }

    updateStepNumbers() {
        document.querySelectorAll('.sequence-step').forEach((step, index) => {
            step.querySelector('.step-number').textContent = '#' + (index + 1);
        });
    }

    syncSequenceFromDOM() {
        const steps = document.querySelectorAll('.sequence-step');
        this.sequence = Array.from(steps).map(step => {
            const type = step.querySelector('.step-type-select').value;
            if (type === 'fermata') {
                return {
                    type: 'fermata',
                    duration: parseFloat(step.querySelector('.step-duration').value)
                };
            } else {
                const bpmStart = parseInt(step.querySelector('.step-bpm-start').value);
                const isRamp = step.querySelector('.step-ramp-toggle').checked;
                const bpmEnd = isRamp ? parseInt(step.querySelector('.step-bpm-end').value) : bpmStart;

                return {
                    type: 'normal',
                    bpmStart: bpmStart,
                    bpmEnd: bpmEnd, // Logic handled here: if not ramp, end = start
                    signature: step.querySelector('.step-signature').value,
                    bars: parseInt(step.querySelector('.step-bars').value)
                };
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.metronomeApp = new Metronome();
});
