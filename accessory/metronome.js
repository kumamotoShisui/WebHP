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

        // 倍テンポ: 1拍あたりのクリック数（0.5=2拍に1回、1=1拍1回、2=八分で2回）。BPMは変えず音の密度だけ変更
        this.tempoMultiplier = 1;

        // Sound customization
        this.soundWave = 'triangle';
        this.soundFreqDownbeat = 1200;
        this.soundFreqBeat = 800;

        // Sequence Mode（練習番号ごとに blocks を格納）
        this.mode = 'simple';
        this.sequence = []; // [{ practiceNo: string, blocks: Step[] }, ...]
        this.startFromStepIndex = null; // その場所から練習用
        this.currentSequenceStepIndex = 0;
        this.barsPlayedInCurrentStep = 0;
        this.totalBarsInCurrentStep = 0;
        this.isFermata = false;
        this.fermataEndTime = 0;

        // Sequence Interpolation
        this.stepStartTempo = 120;
        this.stepEndTempo = 120;

        // Templates
        this.templates = {
            templateA: {
                name: 'templateA',
                tempoRef: '2分音符=76~90',
                steps: [
                    // アウフタクト（0小節）2/2で1小節
                    { type: 'normal', signature: '2/2', bars: 1, bpmStart: 76, bpmEnd: 90, practiceNo: '0' },
                    // A: 小節1-14（5,8小節が3/4、他は2/2）
                    { type: 'normal', signature: '2/2', bars: 4, bpmStart: 76, bpmEnd: 90, practiceNo: 'A' },   // 1-4
                    { type: 'normal', signature: '3/4', bars: 1, bpmStart: 76, bpmEnd: 90, practiceNo: 'A' },   // 5
                    { type: 'normal', signature: '2/2', bars: 2, bpmStart: 76, bpmEnd: 90, practiceNo: 'A' },   // 6-7
                    { type: 'normal', signature: '3/4', bars: 1, bpmStart: 76, bpmEnd: 90, practiceNo: 'A' },   // 8
                    { type: 'normal', signature: '2/2', bars: 6, bpmStart: 76, bpmEnd: 90, practiceNo: 'A' },   // 9-14
                    // B: 15-21 すべて2/2
                    { type: 'normal', signature: '2/2', bars: 7, bpmStart: 76, bpmEnd: 90, practiceNo: 'B' },
                    // C: 22-34 すべて2/2
                    { type: 'normal', signature: '2/2', bars: 13, bpmStart: 76, bpmEnd: 90, practiceNo: 'C' },
                    // D: 35-47 すべて2/2
                    { type: 'normal', signature: '2/2', bars: 13, bpmStart: 76, bpmEnd: 90, practiceNo: 'D' },
                    // E: 48-55 すべて2/2
                    { type: 'normal', signature: '2/2', bars: 8, bpmStart: 76, bpmEnd: 90, practiceNo: 'E' },
                    // F: 56-64 すべて2/2
                    { type: 'normal', signature: '2/2', bars: 9, bpmStart: 76, bpmEnd: 90, practiceNo: 'F' },
                    // G: 65-81 すべて2/2
                    { type: 'normal', signature: '2/2', bars: 17, bpmStart: 76, bpmEnd: 90, practiceNo: 'G' },
                    // H: 82-91（82-89が3/4、90-91が2/2）
                    { type: 'normal', signature: '3/4', bars: 8, bpmStart: 76, bpmEnd: 90, practiceNo: 'H' },   // 82-89
                    { type: 'normal', signature: '2/2', bars: 2, bpmStart: 76, bpmEnd: 90, practiceNo: 'H' },   // 90-91
                    // I: 92-104 すべて2/2
                    { type: 'normal', signature: '2/2', bars: 13, bpmStart: 76, bpmEnd: 90, practiceNo: 'I' },
                    // J: 105-117 すべて2/2
                    { type: 'normal', signature: '2/2', bars: 13, bpmStart: 76, bpmEnd: 90, practiceNo: 'J' },
                    // K: 118-125 すべて2/2
                    { type: 'normal', signature: '2/2', bars: 8, bpmStart: 76, bpmEnd: 90, practiceNo: 'K' },
                    // L: 126-137（129,131が5/4、他は2/2）
                    { type: 'normal', signature: '2/2', bars: 3, bpmStart: 76, bpmEnd: 90, practiceNo: 'L' },   // 126-128
                    { type: 'normal', signature: '5/4', bars: 1, bpmStart: 76, bpmEnd: 90, practiceNo: 'L' },   // 129
                    { type: 'normal', signature: '2/2', bars: 1, bpmStart: 76, bpmEnd: 90, practiceNo: 'L' },   // 130
                    { type: 'normal', signature: '5/4', bars: 1, bpmStart: 76, bpmEnd: 90, practiceNo: 'L' },   // 131
                    { type: 'normal', signature: '2/2', bars: 6, bpmStart: 76, bpmEnd: 90, practiceNo: 'L' },   // 132-137
                    // M: 138-146 すべて2/2（最終小節146）
                    { type: 'normal', signature: '2/2', bars: 9, bpmStart: 76, bpmEnd: 90, practiceNo: 'M' }    // 138-146
                ]
            },
            templateB: {
                name: 'templateB',
                tempoRef: '4分音符=84',
                steps: [
                    // 導入 4小節
                    { type: 'normal', signature: '4/4', bars: 4, bpmStart: 84, bpmEnd: 84, practiceNo: '' },
                    // A: 1-10小節 10小節
                    { type: 'normal', signature: '4/4', bars: 10, bpmStart: 84, bpmEnd: 84, practiceNo: 'A' },
                    // B: 15-23小節 9小節、最後rit
                    { type: 'normal', signature: '4/4', bars: 8, bpmStart: 84, bpmEnd: 84, practiceNo: 'B' },
                    { type: 'normal', signature: '4/4', bars: 1, bpmStart: 84, bpmEnd: 60, practiceNo: 'B' },   // 23小節 rit
                    // C: 24-31小節 Doloroso atempo 8小節
                    { type: 'normal', signature: '4/4', bars: 8, bpmStart: 84, bpmEnd: 84, practiceNo: 'C' },
                    // D: 32-39小節 8小節、39小節 poco rit
                    { type: 'normal', signature: '4/4', bars: 7, bpmStart: 84, bpmEnd: 84, practiceNo: 'D' },
                    { type: 'normal', signature: '4/4', bars: 1, bpmStart: 84, bpmEnd: 65, practiceNo: 'D' },   // 39小節 poco rit
                    // E: 40-52小節 40-43 accel、44-51 126、52 rit
                    { type: 'normal', signature: '4/4', bars: 4, bpmStart: 84, bpmEnd: 126, practiceNo: 'E' },  // 40-43 accel
                    { type: 'normal', signature: '4/4', bars: 8, bpmStart: 126, bpmEnd: 126, practiceNo: 'E' }, // 44-51
                    { type: 'normal', signature: '4/4', bars: 1, bpmStart: 126, bpmEnd: 80, practiceNo: 'E' },  // 52 rit
                    // F: 53-60小節 8小節 84
                    { type: 'normal', signature: '4/4', bars: 8, bpmStart: 84, bpmEnd: 84, practiceNo: 'F' },
                    // G: 61-70小節 10小節、70 rit
                    { type: 'normal', signature: '4/4', bars: 9, bpmStart: 84, bpmEnd: 84, practiceNo: 'G' },
                    { type: 'normal', signature: '4/4', bars: 1, bpmStart: 84, bpmEnd: 60, practiceNo: 'G' },   // 70 rit
                    // H: 71-82小節 71-77 112、78 molto rit、79-82 Tranquillo 84
                    { type: 'normal', signature: '4/4', bars: 7, bpmStart: 112, bpmEnd: 112, practiceNo: 'H' }, // 71-77
                    { type: 'fermata', duration: 2.0, practiceNo: 'H' },   // 78 molto rit riten
                    { type: 'normal', signature: '4/4', bars: 4, bpmStart: 84, bpmEnd: 84, practiceNo: 'H' }    // 79-82 Tranquillo
                ]
            }
        };

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

        // Tempo multiplier (倍テンポ)
        document.querySelectorAll('.tempo-mult-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mult = parseFloat(btn.dataset.mult);
                this.tempoMultiplier = mult;
                document.querySelectorAll('.tempo-mult-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateTempoMultLabel();
            });
        });
        this.updateTempoMultLabel();

        // Sound customization
        const soundPreset = document.getElementById('sound-preset');
        const soundWave = document.getElementById('sound-wave');
        const soundFreqDownbeat = document.getElementById('sound-freq-downbeat');
        const soundFreqBeat = document.getElementById('sound-freq-beat');
        if (soundPreset) {
            soundPreset.addEventListener('change', (e) => this.applySoundPreset(e.target.value));
        }
        if (soundWave) {
            soundWave.addEventListener('change', (e) => { this.soundWave = e.target.value; });
        }
        if (soundFreqDownbeat) {
            soundFreqDownbeat.addEventListener('input', (e) => { this.soundFreqDownbeat = parseInt(e.target.value) || 800; });
        }
        if (soundFreqBeat) {
            soundFreqBeat.addEventListener('input', (e) => { this.soundFreqBeat = parseInt(e.target.value) || 600; });
        }

        // Mode Switching
        if (this.ui.modeBtns.simple) {
            this.ui.modeBtns.simple.addEventListener('click', () => this.setMode('simple'));
            this.ui.modeBtns.sequence.addEventListener('click', () => this.setMode('sequence'));
        }

        // Sequence Controls
        const addStepBtn = document.getElementById('add-step-btn');
        if (addStepBtn) addStepBtn.addEventListener('click', () => this.addSequenceStep());
        const addGroupBtn = document.getElementById('add-group-btn');
        if (addGroupBtn) addGroupBtn.addEventListener('click', () => this.addSequenceGroup());

        const loadTemplateBtn = document.getElementById('load-template-btn');
        const templateSelect = document.getElementById('template-select');
        if (loadTemplateBtn && templateSelect) {
            loadTemplateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const id = templateSelect.value || (templateSelect.selectedIndex >= 0 && templateSelect.options[templateSelect.selectedIndex]?.value);
                if (id && this.templates[id]) {
                    this.loadTemplate(id);
                }
            });
        }

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

    // 倍テンポはBPMを変えず「1拍あたりのクリック数」のみ。表示・タイミングは常に実BPM

    updateTempoMultLabel() {
        const el = document.getElementById('tempo-mult-label');
        if (!el) return;
        if (this.tempoMultiplier === 1) {
            el.textContent = '';
        } else {
            el.textContent = this.tempoMultiplier === 2 ? '×2' : '×0.5';
        }
    }

    changeTempo(val) {
        let newTempo = parseInt(val);
        if (newTempo < 30) newTempo = 30;
        if (newTempo > 300) newTempo = 300;

        this.tempo = newTempo;
        if (this.ui.bpmDisplay) this.ui.bpmDisplay.textContent = this.tempo;
        if (this.ui.bpmSlider) this.ui.bpmSlider.value = this.tempo;
    }

    applySoundPreset(preset) {
        const waveEl = document.getElementById('sound-wave');
        const downEl = document.getElementById('sound-freq-downbeat');
        const beatEl = document.getElementById('sound-freq-beat');
        const presets = {
            default: { wave: 'triangle', downbeat: 1200, beat: 800 },
            soft: { wave: 'sine', downbeat: 900, beat: 600 },
            bright: { wave: 'square', downbeat: 1000, beat: 700 },
            low: { wave: 'triangle', downbeat: 600, beat: 400 }
        };
        const p = presets[preset] || presets.default;
        this.soundWave = p.wave;
        this.soundFreqDownbeat = p.downbeat;
        this.soundFreqBeat = p.beat;
        if (waveEl) waveEl.value = p.wave;
        if (downEl) downEl.value = p.downbeat;
        if (beatEl) beatEl.value = p.beat;
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

    getFlatSteps() {
        return this.sequence.flatMap(g => g.blocks || []);
    }

    startFromStep(stepIndex) {
        const flat = this.getFlatSteps();
        if (stepIndex < 0 || stepIndex >= flat.length) return;
        this.startFromStepIndex = stepIndex;
        if (this.mode !== 'sequence') {
            this.setMode('sequence');
        }
        if (!this.isPlaying) {
            this.start();
        } else {
            this.stop();
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

        const startFrom = (typeof this.startFromStepIndex === 'number' && this.startFromStepIndex >= 0)
            ? this.startFromStepIndex : 0;
        this.startFromStepIndex = null;

        this.currentSequenceStepIndex = startFrom;
        this.barsPlayedInCurrentStep = 0;

        if (this.mode === 'sequence') {
            this.loadStep(startFrom);
            const status = document.getElementById('seq-status');
            if (status) status.style.display = 'block';
            const overlay = document.getElementById('seq-progress-overlay');
            if (overlay) overlay.classList.remove('hidden');
            this.updateSeqProgressDisplay();
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
        const overlay = document.getElementById('seq-progress-overlay');
        if (overlay) overlay.classList.add('hidden');
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
        const flat = this.getFlatSteps();
        if (this.currentSequenceStepIndex >= flat.length) {
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

    getTotalBarsInSequence() {
        return this.getFlatSteps().reduce((sum, s) => sum + (s.type === 'normal' ? (s.bars || 0) : 0), 0);
    }

    getCumulativeBarsPlayed() {
        const flat = this.getFlatSteps();
        let sum = 0;
        for (let i = 0; i < this.currentSequenceStepIndex; i++) {
            const s = flat[i];
            if (s.type === 'normal') sum += s.bars || 0;
        }
        return sum + (this.isFermata ? 0 : this.barsPlayedInCurrentStep);
    }

    updateSequenceState() {
        this.updateSeqProgressDisplay();
    }

    updateSeqProgressDisplay() {
        const visStep = document.getElementById('seq-vis-step');
        const visTotalSteps = document.getElementById('seq-vis-total-steps');
        const visBar = document.getElementById('seq-vis-bar');
        const visTotalBars = document.getElementById('seq-vis-total-bars');
        const progressBar = document.getElementById('seq-progress-bar');
        const curEl = document.getElementById('seq-current-bar');
        const totalEl = document.getElementById('seq-total-bars');
        if (!visStep || !visBar) return;

        const flat = this.getFlatSteps();
        visStep.textContent = this.currentSequenceStepIndex + 1;
        visTotalSteps.textContent = flat.length;

        const step = flat[this.currentSequenceStepIndex];
        const practiceLabel = step && step.practiceNo ? ' [' + step.practiceNo + ']' : '';
        const visPractice = document.getElementById('seq-vis-practice');
        const curPractice = document.getElementById('seq-current-practice');
        if (visPractice) visPractice.textContent = practiceLabel;
        if (curPractice) curPractice.textContent = practiceLabel;

        const totalBars = this.getTotalBarsInSequence();

        if (this.isFermata) {
            visBar.textContent = '-';
            if (visTotalBars) visTotalBars.textContent = totalBars;
            if (curEl) curEl.textContent = '-';
            if (totalEl) totalEl.textContent = totalBars;
            if (progressBar) progressBar.style.width = totalBars > 0 ? Math.min(100, (this.getCumulativeBarsPlayed() / totalBars) * 100) + '%' : '0%';
            return;
        }

        const cumulative = this.getCumulativeBarsPlayed();
        const currentBar = cumulative + 1;
        visBar.textContent = currentBar;
        if (visTotalBars) visTotalBars.textContent = totalBars;
        if (curEl) curEl.textContent = currentBar;
        if (totalEl) totalEl.textContent = totalBars;

        if (progressBar && totalBars > 0) {
            const pct = Math.min(100, (currentBar / totalBars) * 100);
            progressBar.style.width = pct + '%';
        }
    }

    loadStep(index) {
        const step = this.getFlatSteps()[index];
        if (!step) return;

        if (step.type === 'fermata') {
            this.isFermata = true;
            this.fermataEndTime = this.audioContext.currentTime + (step.duration || 2.0);
            const stepEl = document.getElementById('seq-current-step');
            if (stepEl) stepEl.textContent = index + 1 + " (Fermata)";
            const curPractice = document.getElementById('seq-current-practice');
            if (curPractice) curPractice.textContent = step.practiceNo ? ' [' + step.practiceNo + ']' : '';
            this.updateSeqProgressDisplay();
            return;
        }

        this.stepStartTempo = step.bpmStart;
        this.stepEndTempo = step.bpmEnd;
        this.tempo = this.stepStartTempo;

        this.setTimeSignature(step.signature);
        this.totalBarsInCurrentStep = step.bars;
        this.barsPlayedInCurrentStep = 0;

        if (this.ui.bpmDisplay) this.ui.bpmDisplay.textContent = Math.round(this.tempo);
        const stepEl = document.getElementById('seq-current-step');
        if (stepEl) stepEl.textContent = index + 1;
        const curPractice = document.getElementById('seq-current-practice');
        if (curPractice) curPractice.textContent = step.practiceNo ? ' [' + step.practiceNo + ']' : '';
        this.updateSeqProgressDisplay();
    }

    scheduleNote(beatNumber, time) {
        const sixteenthsPerBeat = 16 / this.timeSignature[1];
        const clickEvery = sixteenthsPerBeat / this.tempoMultiplier;

        if (clickEvery > 0 && beatNumber % clickEvery === 0) {
            const beatIndex = beatNumber / clickEvery;
            const beatInMeasure = Math.floor(beatIndex / this.tempoMultiplier);

            this.notesInQueue.push({ note: beatIndex, time: time });

            const osc = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            osc.connect(gainNode);
            if (this.masterGainNode) gainNode.connect(this.masterGainNode);

            osc.type = this.soundWave;

            const isFirstClickOfBeat = (this.tempoMultiplier >= 2)
                ? (beatIndex % Math.round(this.tempoMultiplier) === 0)
                : true;
            let isAccented = (beatInMeasure === 0) && isFirstClickOfBeat;
            let freq = this.soundFreqBeat;

            if (this.grouping.length > 0) {
                let sum = 0;
                let groupIndex = -1;
                for (let i = 0; i < this.grouping.length; i++) {
                    if (beatInMeasure === sum) {
                        groupIndex = i;
                        break;
                    }
                    sum += this.grouping[i];
                }

                if (groupIndex !== -1) {
                    isAccented = isFirstClickOfBeat;
                    freq = (beatInMeasure === 0 && isFirstClickOfBeat) ? this.soundFreqDownbeat : Math.min(this.soundFreqDownbeat, this.soundFreqBeat + 200);
                }
            } else {
                if (this.timeSignature[0] === 6 && this.timeSignature[1] === 8) {
                    if (beatInMeasure === 3) isAccented = isFirstClickOfBeat;
                    freq = (beatInMeasure === 0 && isFirstClickOfBeat) ? this.soundFreqDownbeat : (beatInMeasure === 3 ? Math.min(this.soundFreqDownbeat, this.soundFreqBeat + 200) : this.soundFreqBeat);
                } else if (this.timeSignature[0] === 5 && this.timeSignature[1] === 8) {
                    freq = (beatInMeasure === 0 && isFirstClickOfBeat) ? this.soundFreqDownbeat : (beatInMeasure === 3 ? Math.min(this.soundFreqDownbeat, this.soundFreqBeat + 200) : this.soundFreqBeat);
                } else if (this.timeSignature[0] === 1 && this.timeSignature[1] === 4) {
                    isAccented = true;
                    freq = this.soundFreqDownbeat;
                } else {
                    freq = isAccented ? this.soundFreqDownbeat : this.soundFreqBeat;
                }
            }

            if (this.barsPlayedInCurrentStep < 0) {
                freq = Math.min(600, this.soundFreqBeat);
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
            grad.addColorStop(0, "rgba(100, 116, 139, 0)");
            grad.addColorStop(1, "rgba(100, 116, 139, 0.5)");
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
        this.ctx.fillStyle = '#64748b';
        this.ctx.shadowBlur = 12;
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
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

    _createStepBlock(stepData) {
        const stepTemplate = document.getElementById('step-template');
        const clone = stepTemplate.content.cloneNode(true);
        const div = clone.querySelector('.sequence-step');
        const data = stepData || { type: 'normal', bpmStart: 76, bpmEnd: 76, signature: '2/2', bars: 4 };

        div.querySelector('.step-type-select').value = data.type || 'normal';
        const isFermata = (data.type === 'fermata');
        div.querySelector('.type-normal').style.display = isFermata ? 'none' : 'grid';
        div.querySelector('.type-fermata').style.display = isFermata ? 'block' : 'none';
        if (data.type === 'fermata') {
            div.querySelector('.step-duration').value = data.duration ?? 2.0;
        } else {
            div.querySelector('.step-bpm-start').value = data.bpmStart ?? 76;
            div.querySelector('.step-bpm-end').value = data.bpmEnd ?? data.bpmStart ?? 76;
            const hasRamp = data.bpmStart !== data.bpmEnd;
            div.querySelector('.step-ramp-toggle').checked = hasRamp;
            div.querySelector('.ramp-end-group').style.display = hasRamp ? 'block' : 'none';
            div.querySelector('.step-signature').value = data.signature || '2/2';
            div.querySelector('.step-bars').value = data.bars ?? 4;
        }

        const list = document.getElementById('sequence-list');
        const bindStepEvents = (stepEl) => {
            stepEl.querySelectorAll('input, select').forEach(input => {
                input.addEventListener('change', () => {
                    if (input.classList.contains('step-type-select')) {
                        const f = (input.value === 'fermata');
                        stepEl.querySelector('.type-normal').style.display = f ? 'none' : 'grid';
                        stepEl.querySelector('.type-fermata').style.display = f ? 'block' : 'none';
                    }
                    if (input.classList.contains('step-ramp-toggle')) {
                        stepEl.querySelector('.ramp-end-group').style.display = input.checked ? 'block' : 'none';
                    }
                    this.syncSequenceFromDOM();
                });
            });
            stepEl.querySelector('.remove-step')?.addEventListener('click', (e) => {
                e.stopPropagation();
                stepEl.remove();
                this.syncSequenceFromDOM();
                this.updateStepNumbers();
            });
            stepEl.querySelector('.start-from-here-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = this._getFlatStepIndex(stepEl);
                if (idx >= 0) this.startFromStep(idx);
            });
        };
        bindStepEvents(div);
        return div;
    }

    _getFlatStepIndex(stepEl) {
        const all = document.querySelectorAll('#sequence-list .sequence-step');
        return Array.from(all).indexOf(stepEl);
    }

    loadTemplate(templateId) {
        const tpl = this.templates[templateId];
        if (!tpl || !tpl.steps) return;

        const list = document.getElementById('sequence-list');
        list.innerHTML = '';
        list.querySelector('.empty-state')?.remove();

        const groupTpl = document.getElementById('practice-group-template');

        // 練習番号ごとにグループ化
        const groups = [];
        let prev = null;
        for (const s of tpl.steps) {
            const pn = (s.practiceNo != null && s.practiceNo !== '') ? String(s.practiceNo) : '';
            if (prev !== pn) {
                groups.push({ practiceNo: pn, blocks: [s] });
                prev = pn;
            } else {
                groups[groups.length - 1].blocks.push(s);
            }
        }

        groups.forEach(grp => {
            const gClone = groupTpl.content.cloneNode(true);
            const groupDiv = gClone.querySelector('.practice-group');
            const header = groupDiv.querySelector('.group-practice-no');
            const blocksContainer = groupDiv.querySelector('.practice-group-blocks');
            header.value = grp.practiceNo;

            header.addEventListener('change', () => this.syncSequenceFromDOM());
            header.addEventListener('input', () => this.syncSequenceFromDOM());

            groupDiv.querySelector('.add-block-btn')?.addEventListener('click', () => {
                const block = this._createStepBlock();
                blocksContainer.appendChild(block);
                this.updateStepNumbers();
                this.syncSequenceFromDOM();
            });

            groupDiv.querySelector('.remove-group')?.addEventListener('click', (e) => {
                e.stopPropagation();
                groupDiv.remove();
                this.syncSequenceFromDOM();
                this.updateStepNumbers();
            });

            grp.blocks.forEach(blockData => {
                const block = this._createStepBlock(blockData);
                blocksContainer.appendChild(block);
            });

            list.appendChild(groupDiv);
        });

        this.updateStepNumbers();
        this.syncSequenceFromDOM();
    }

    addSequenceStep() {
        const list = document.getElementById('sequence-list');
        if (list.querySelector('.empty-state')) list.innerHTML = '';

        const groupTpl = document.getElementById('practice-group-template');
        const lastGroup = list.querySelector('.practice-group:last-child');
        const blocksContainer = lastGroup?.querySelector('.practice-group-blocks');

        if (blocksContainer) {
            const block = this._createStepBlock();
            blocksContainer.appendChild(block);
        } else {
            const gClone = groupTpl.content.cloneNode(true);
            const groupDiv = gClone.querySelector('.practice-group');
            const blocksContainerNew = groupDiv.querySelector('.practice-group-blocks');
            groupDiv.querySelector('.group-practice-no').addEventListener('input', () => this.syncSequenceFromDOM());
            groupDiv.querySelector('.add-block-btn')?.addEventListener('click', () => {
                const block = this._createStepBlock();
                blocksContainerNew.appendChild(block);
                this.updateStepNumbers();
                this.syncSequenceFromDOM();
            });
            groupDiv.querySelector('.remove-group')?.addEventListener('click', (e) => {
                e.stopPropagation();
                groupDiv.remove();
                this.syncSequenceFromDOM();
                this.updateStepNumbers();
            });
            const block = this._createStepBlock();
            blocksContainerNew.appendChild(block);
            list.appendChild(groupDiv);
        }

        this.updateStepNumbers();
        this.syncSequenceFromDOM();
    }

    addSequenceGroup() {
        const list = document.getElementById('sequence-list');
        if (list.querySelector('.empty-state')) list.innerHTML = '';

        const groupTpl = document.getElementById('practice-group-template');
        const gClone = groupTpl.content.cloneNode(true);
        const groupDiv = gClone.querySelector('.practice-group');
        const blocksContainerNew = groupDiv.querySelector('.practice-group-blocks');

        groupDiv.querySelector('.group-practice-no').addEventListener('input', () => this.syncSequenceFromDOM());
        groupDiv.querySelector('.add-block-btn')?.addEventListener('click', () => {
            const block = this._createStepBlock();
            blocksContainerNew.appendChild(block);
            this.updateStepNumbers();
            this.syncSequenceFromDOM();
        });
        groupDiv.querySelector('.remove-group')?.addEventListener('click', (e) => {
            e.stopPropagation();
            groupDiv.remove();
            this.syncSequenceFromDOM();
            this.updateStepNumbers();
        });

        const block = this._createStepBlock();
        blocksContainerNew.appendChild(block);
        list.appendChild(groupDiv);

        this.updateStepNumbers();
        this.syncSequenceFromDOM();
    }

    updateStepNumbers() {
        document.querySelectorAll('#sequence-list .sequence-step').forEach((step, index) => {
            const numEl = step.querySelector('.step-number');
            if (numEl) numEl.textContent = '#' + (index + 1);
            step.dataset.stepIndex = index;
        });
    }

    syncSequenceFromDOM() {
        const list = document.getElementById('sequence-list');
        const groupEls = list.querySelectorAll('.practice-group');
        this.sequence = Array.from(groupEls).map(group => {
            const practiceNo = (group.querySelector('.group-practice-no')?.value || '').trim() || undefined;
            const steps = group.querySelectorAll('.practice-group-blocks .sequence-step');
            const blocks = Array.from(steps).map(step => {
                const type = step.querySelector('.step-type-select').value;
                if (type === 'fermata') {
                    return {
                        type: 'fermata',
                        practiceNo,
                        duration: parseFloat(step.querySelector('.step-duration').value)
                    };
                }
                const bpmStart = parseInt(step.querySelector('.step-bpm-start').value);
                const isRamp = step.querySelector('.step-ramp-toggle').checked;
                const bpmEnd = isRamp ? parseInt(step.querySelector('.step-bpm-end').value) : bpmStart;
                return {
                    type: 'normal',
                    practiceNo,
                    bpmStart, bpmEnd,
                    signature: step.querySelector('.step-signature').value,
                    bars: parseInt(step.querySelector('.step-bars').value)
                };
            });
            return { practiceNo, blocks };
        });
        this.updateStepNumbers();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.metronomeApp = new Metronome();
});
