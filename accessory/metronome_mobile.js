// Mobile Metronome Logic - Debug Version

// Debug Logger
function logDebug(msg) {
    const box = document.getElementById('debug-console');
    if (box) {
        box.textContent = msg + '\n' + box.textContent;
    }
    console.log(msg);
}

class MetronomeMobile {
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

        // Sequence
        this.sequence = [];
        this.currentSequenceStepIndex = 0;
        this.barsPlayedInCurrentStep = 0;
        this.totalBarsInCurrentStep = 0;
        this.stepStartTempo = 120;
        this.stepEndTempo = 120;
        this.mode = 'simple';

        // Settings
        this.timeSignature = [4, 4];
        this.grouping = [];
        this.precountBars = 0;
        this.volume = 2.0;

        // Initial Audio Notes
        this.notesInQueue = [];

        // UI Refs
        this.ui = {
            playBtn: document.getElementById('play-btn'),
            bpmDisplay: document.getElementById('bpm-display'),
            bpmSlider: document.getElementById('bpm-slider'),
            bpmMinus: document.getElementById('bpm-minus'),
            bpmPlus: document.getElementById('bpm-plus'),
            volumeSlider: document.getElementById('volume-slider'),
            beatVisual: document.getElementById('beat-visual'),
            beatCounter: document.getElementById('beat-counter'),
            modeSimple: document.getElementById('mode-simple'),
            modeSequence: document.getElementById('mode-sequence'),
            viewSimple: document.getElementById('simple-view'),
            viewSequence: document.getElementById('sequence-view'),
            timeSig: document.getElementById('time-signature'),
            precount: document.getElementById('precount-bars'),
            addStepBtn: document.getElementById('add-step-btn'),
            seqList: document.getElementById('sequence-list'),
            seqLoop: document.getElementById('sequence-loop'),
            seqStatus: document.getElementById('seq-status')
        };

        this.canvas = document.getElementById('conductor-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.init();
    }

    init() {
        try {
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());

            // Simple event binding - standard click for everything
            // Note: iOS Safari handles click just fine for AudioContext resume if inside a handler logic

            this.ui.playBtn.onclick = () => this.togglePlay();

            this.ui.bpmSlider.oninput = (e) => this.changeTempo(e.target.value);
            this.ui.bpmMinus.onclick = () => this.changeTempo(this.tempo - 1);
            this.ui.bpmPlus.onclick = () => this.changeTempo(this.tempo + 1);

            this.ui.timeSig.onchange = (e) => this.setTimeSignature(e.target.value);
            this.ui.precount.onchange = (e) => this.precountBars = parseInt(e.target.value);

            this.ui.volumeSlider.oninput = (e) => this.setVolume(e.target.value);

            this.ui.modeSimple.onclick = () => this.setMode('simple');
            this.ui.modeSequence.onclick = () => this.setMode('sequence');

            this.ui.addStepBtn.onclick = () => this.addSequenceStep();

            // Init values
            this.changeTempo(120);
            this.setVolume(this.ui.volumeSlider.value);

            logDebug("Ready.");
            requestAnimationFrame(this.draw.bind(this));
        } catch (e) {
            logDebug("Init Error: " + e.message);
        }
    }

    initAudio() {
        if (this.audioContext) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGainNode = this.audioContext.createGain();
            this.setVolume(this.ui.volumeSlider.value);
            this.masterGainNode.connect(this.audioContext.destination);
            logDebug("Audio Init OK");
        } catch (e) {
            logDebug("Audio Init Fail: " + e.message);
        }
    }

    setVolume(sliderval) {
        this.volume = (sliderval / 100) * 5.0;
        if (this.masterGainNode) {
            this.masterGainNode.gain.value = this.volume;
        }
    }

    resizeCanvas() {
        if (!this.canvas) return;
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight;
    }

    changeTempo(val) {
        let t = parseInt(val);
        if (t < 30) t = 30; if (t > 300) t = 300;
        this.tempo = t;
        this.ui.bpmDisplay.textContent = t;
        this.ui.bpmSlider.value = t;
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

    setMode(m) {
        this.mode = m;
        this.ui.modeSimple.classList.toggle('active', m === 'simple');
        this.ui.modeSequence.classList.toggle('active', m === 'sequence');
        this.ui.viewSimple.classList.toggle('hidden', m !== 'simple');
        this.ui.viewSequence.classList.toggle('hidden', m !== 'sequence');
        this.stop();
    }

    togglePlay() {
        if (this.isPlaying) this.stop();
        else this.start();
    }

    start() {
        this.initAudio();
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                logDebug("Audio Resumed");
            });
        }

        this.isPlaying = true;
        this.ui.playBtn.classList.add('playing');

        // Focus Mode
        const ft = document.getElementById('focus-mode-toggle');
        if (ft && ft.checked) {
            document.body.classList.add('focus-active');
        }

        this.current16thNote = 0;
        this.nextNoteTime = this.audioContext.currentTime + 0.1;

        this.barsPlayedInCurrentStep = 0;
        if (this.mode === 'sequence') {
            this.ui.seqStatus.style.display = 'block';
            this.loadStep(0);
        } else {
            if (this.precountBars > 0) this.barsPlayedInCurrentStep = -this.precountBars;
        }

        this.timerID = setInterval(() => this.scheduler(), this.lookahead);
        logDebug("Started");
    }

    stop() {
        this.isPlaying = false;
        this.ui.playBtn.classList.remove('playing');

        document.body.classList.remove('focus-active');

        clearInterval(this.timerID);
        this.ui.seqStatus.style.display = 'none';
        this.ui.beatCounter.textContent = '1';
        this.ui.beatCounter.classList.remove('active');
        logDebug("Stopped");
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

    scheduleNote(beatNumber, time) {
        const sixteenths = 16 / this.timeSignature[1];
        if (beatNumber % sixteenths === 0) {
            const beatIndex = beatNumber / sixteenths;
            this.notesInQueue.push({ note: beatIndex, time: time });

            const osc = this.audioContext.createOscillator();
            const gn = this.audioContext.createGain();
            osc.connect(gn);
            if (this.masterGainNode) gn.connect(this.masterGainNode);

            osc.type = 'triangle';
            let freq = 800;
            let accented = (beatIndex === 0);

            // Grouping Logic
            if (this.grouping.length > 0) {
                let sum = 0;
                let grpIdx = -1;
                for (let i = 0; i < this.grouping.length; i++) {
                    if (beatIndex === sum) { grpIdx = i; break; }
                    sum += this.grouping[i];
                }
                if (grpIdx !== -1) {
                    accented = true;
                    freq = (beatIndex === 0) ? 1200 : 1000;
                }
            } else {
                if (this.timeSignature[0] === 6 && this.timeSignature[1] === 8) {
                    if (beatIndex === 3) accented = true;
                    if (beatIndex === 0) freq = 1200;
                    else if (beatIndex === 3) freq = 1000;
                } else if (this.timeSignature[0] === 1 && this.timeSignature[1] === 4) {
                    accented = true; freq = 1200;
                } else {
                    if (accented) freq = 1200;
                }
            }

            if (this.barsPlayedInCurrentStep < 0) freq = 600;

            osc.frequency.value = freq;
            gn.gain.setValueAtTime(1, time);
            gn.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
            osc.start(time);
            osc.stop(time + 0.1);
        }
    }

    nextNote() {
        let currentInstantTempo = this.tempo;

        if (this.mode === 'sequence' && this.stepStartTempo !== this.stepEndTempo && this.barsPlayedInCurrentStep >= 0) {
            const progress = (this.barsPlayedInCurrentStep + (this.current16thNote / 16)) / this.totalBarsInCurrentStep;
            let p = progress;
            if (p < 0) p = 0; if (p > 1) p = 1;
            currentInstantTempo = this.stepStartTempo + (this.stepEndTempo - this.stepStartTempo) * p;

            if (this.current16thNote === 0) {
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
            if (this.barsPlayedInCurrentStep < 0) this.barsPlayedInCurrentStep++;
        }
    }

    finishSequenceStep() {
        this.currentSequenceStepIndex++;
        if (this.currentSequenceStepIndex >= this.sequence.length) {
            if (this.ui.seqLoop.checked) {
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
            document.getElementById('seq-current-step').textContent = index + 1 + " (Wait)";
            document.getElementById('seq-current-bar').textContent = "-";
            return;
        }
        this.stepStartTempo = step.bpmStart;
        this.stepEndTempo = step.bpmEnd;
        this.tempo = this.stepStartTempo;
        this.setTimeSignature(step.signature);
        this.totalBarsInCurrentStep = step.bars;
        this.barsPlayedInCurrentStep = 0;
        this.ui.bpmDisplay.textContent = Math.round(this.tempo);
        document.getElementById('seq-current-step').textContent = index + 1;
        document.getElementById('seq-current-bar').textContent = 1;
        document.getElementById('seq-total-bars').textContent = step.bars;
    }

    addSequenceStep() {
        const empty = this.ui.seqList.querySelector('.empty-msg');
        if (empty) empty.remove();
        const template = document.getElementById('step-template');
        const clone = template.content.cloneNode(true);
        const div = clone.querySelector('.step-card');
        this.ui.seqList.appendChild(div);

        div.querySelector('.step-remove').onclick = () => {
            div.remove();
            this.syncSequence();
            this.updateStepNumbers();
        };

        const inputs = div.querySelectorAll('input, select');
        inputs.forEach(inp => {
            inp.onchange = () => {
                if (inp.classList.contains('step-type-select')) {
                    const isFerm = inp.value === 'fermata';
                    div.querySelector('.type-normal').style.display = isFerm ? 'none' : 'block';
                    div.querySelector('.type-fermata').style.display = isFerm ? 'block' : 'none';
                }
                if (inp.classList.contains('step-ramp-toggle')) {
                    div.querySelector('.ramp-end-field').style.display = inp.checked ? 'block' : 'none';
                }
                this.syncSequence();
            };
        });

        this.updateStepNumbers();
        this.syncSequence();
    }

    updateStepNumbers() {
        const steps = this.ui.seqList.querySelectorAll('.step-card');
        steps.forEach((s, i) => {
            s.querySelector('.step-idx').textContent = '#' + (i + 1);
        });
    }

    syncSequence() {
        const steps = this.ui.seqList.querySelectorAll('.step-card');
        this.sequence = Array.from(steps).map(div => {
            const type = div.querySelector('.step-type-select').value;
            if (type === 'fermata') {
                return { type: 'fermata', duration: parseFloat(div.querySelector('.step-duration').value) };
            }
            const start = parseInt(div.querySelector('.step-bpm-start').value);
            const ramp = div.querySelector('.step-ramp-toggle').checked;
            return {
                type: 'normal',
                bpmStart: start,
                bpmEnd: ramp ? parseInt(div.querySelector('.step-bpm-end').value) : start,
                signature: div.querySelector('.step-signature').value,
                bars: parseInt(div.querySelector('.step-bars').value)
            };
        });
    }

    draw() {
        const ct = this.audioContext ? this.audioContext.currentTime : 0;
        while (this.notesInQueue.length && this.notesInQueue[0].time < ct) {
            const n = this.notesInQueue.shift();
            this.updateVisuals(n.note);
        }
        this.drawAnimation();
        requestAnimationFrame(this.draw.bind(this));
    }

    updateVisuals(note) {
        this.ui.beatCounter.textContent = Math.floor(note) + 1;
        if (this.barsPlayedInCurrentStep < 0) this.ui.beatCounter.style.color = '#ef4444';
        else this.ui.beatCounter.style.color = '';

        this.ui.beatVisual.classList.add('active');
        if (note === 0) this.ui.beatVisual.classList.add('downbeat');
        setTimeout(() => {
            this.ui.beatVisual.classList.remove('active');
            this.ui.beatVisual.classList.remove('downbeat');
        }, 100);
    }

    drawAnimation() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const secondsPerBeat = 60 / this.tempo;
        let p = 0;

        if (this.isPlaying && this.audioContext) {
            const timeToNext = this.nextNoteTime - this.audioContext.currentTime;
            p = 1 - (timeToNext / secondsPerBeat);
            if (p < 0) p = 0; if (p > 1) p = 1;
        }

        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;

        // Pulse
        this.ctx.beginPath();
        let r = 20 + (p * 15);
        this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(56, 189, 248, ${0.2 + p * 0.8})`;
        this.ctx.fill();

        // Orbit
        this.ctx.beginPath();
        const ang = (Date.now() / 500) % (Math.PI * 2);
        this.ctx.arc(cx + Math.cos(ang) * 50, cy + Math.sin(ang) * 50, 5, 0, Math.PI * 2);
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();
    }
}

window.onerror = function (msg, url, lineNo, columnNo, error) {
    const box = document.getElementById('debug-console');
    if (box) box.textContent = "Error: " + msg + "\n" + box.textContent;
    return false;
};

document.addEventListener('DOMContentLoaded', () => {
    window.mobileApp = new MetronomeMobile();
});
