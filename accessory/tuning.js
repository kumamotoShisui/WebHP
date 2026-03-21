/**
 * Simple chromatic tuner — Web Audio + autocorrelation
 */
(function () {
    var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    /** これ未満の RMS は無音扱い（環境ノイズの誤検出を減らす） */
    var RMS_THRESHOLD = 0.024;
    /** 自己相関のピークが弱いときは周期が曖昧なので無視 */
    var CORR_RATIO_MIN = 0.12;

    var playBtn = document.getElementById('tune-mic-btn');
    var noteEl = document.getElementById('tune-note');
    var hzEl = document.getElementById('tune-hz');
    var needleEl = document.getElementById('tune-needle');
    var refSelect = document.getElementById('tune-ref-hz');

    var audioCtx = null;
    var analyser = null;
    var mediaStream = null;
    var rafId = null;
    var buffer = null;
    var smoothFreq = -1;

    function getRefHz() {
        var v = refSelect && refSelect.value;
        return v ? parseFloat(v, 10) : 440;
    }

    function freqToNearestNote(freq, refHz) {
        if (!freq || freq < 20 || freq > 5000) return null;
        var midi = 69 + 12 * (Math.log(freq / refHz) / Math.LN2);
        var rounded = Math.round(midi);
        var cents = Math.round((midi - rounded) * 100);
        var n = ((rounded % 12) + 12) % 12;
        var octave = Math.floor(rounded / 12) - 1;
        return {
            name: NOTE_NAMES[n] + octave,
            shortName: NOTE_NAMES[n],
            octave: octave,
            cents: cents,
            midi: rounded
        };
    }

    function detectPitch(timeData, sampleRate) {
        var SIZE = timeData.length;
        var minF = 65;
        var maxF = 1320;
        var minLag = Math.floor(sampleRate / maxF);
        var maxLag = Math.min(Math.floor(sampleRate / minF), Math.floor(SIZE / 2) - 2);
        if (maxLag <= minLag) return -1;

        var ac0 = 0;
        var i;
        for (i = 0; i < SIZE; i++) ac0 += timeData[i] * timeData[i];
        var rms = Math.sqrt(ac0 / SIZE);
        if (rms < RMS_THRESHOLD) return -1;

        var bestLag = -1;
        var bestCorr = 0;
        for (var lag = minLag; lag <= maxLag; lag++) {
            var corr = 0;
            for (i = 0; i < SIZE - lag; i++) {
                corr += timeData[i] * timeData[i + lag];
            }
            if (corr > bestCorr) {
                bestCorr = corr;
                bestLag = lag;
            }
        }
        if (bestLag < minLag) return -1;

        if (ac0 <= 0 || bestCorr / ac0 < CORR_RATIO_MIN) return -1;

        var f0 = sampleRate / bestLag;
        if (bestLag > minLag && bestLag < maxLag) {
            var c0 = 0, c1 = 0, c2 = 0;
            var L = bestLag;
            for (i = 0; i < SIZE - L; i++) c1 += timeData[i] * timeData[i + L];
            for (i = 0; i < SIZE - L + 1; i++) c0 += timeData[i] * timeData[i + L - 1];
            for (i = 0; i < SIZE - L - 1; i++) c2 += timeData[i] * timeData[i + L + 1];
            var denom = c0 - 2 * c1 + c2;
            if (Math.abs(denom) > 1e-10) {
                var delta = (c0 - c2) / (2 * denom);
                var refinedLag = L + delta;
                if (refinedLag > minLag && refinedLag < maxLag) f0 = sampleRate / refinedLag;
            }
        }
        return f0;
    }

    function updateUI(freq, refHz) {
        if (freq < 20) {
            noteEl.textContent = '—';
            noteEl.classList.add('dim');
            hzEl.textContent = '— Hz';
            needleEl.style.left = '50%';
            smoothFreq = -1;
            return;
        }
        noteEl.classList.remove('dim');
        var ema = smoothFreq < 0 ? freq : smoothFreq * 0.85 + freq * 0.15;
        smoothFreq = ema;

        hzEl.textContent = ema.toFixed(1) + ' Hz';
        var info = freqToNearestNote(ema, refHz);
        if (!info) {
            noteEl.textContent = '—';
            needleEl.style.left = '50%';
            return;
        }
        noteEl.textContent = info.name;
        var cents = Math.max(-50, Math.min(50, info.cents));
        var t = (cents + 50) / 100;
        needleEl.style.left = t * 100 + '%';
    }

    function tick() {
        if (!analyser || !buffer) return;
        analyser.getFloatTimeDomainData(buffer);
        var freq = detectPitch(buffer, audioCtx.sampleRate);
        updateUI(freq, getRefHz());
        rafId = requestAnimationFrame(tick);
    }

    function stopMic() {
        if (rafId != null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        if (mediaStream) {
            mediaStream.getTracks().forEach(function (t) {
                t.stop();
            });
            mediaStream = null;
        }
        if (audioCtx) {
            audioCtx.close();
            audioCtx = null;
        }
        analyser = null;
        buffer = null;
        smoothFreq = -1;
        if (playBtn) {
            playBtn.classList.remove('playing');
            playBtn.setAttribute('aria-pressed', 'false');
        }
        noteEl.textContent = '—';
        noteEl.classList.add('dim');
        hzEl.textContent = '— Hz';
        needleEl.style.left = '50%';
    }

    function startMic() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('このブラウザではマイク入力が使えません。');
            return;
        }
        navigator.mediaDevices
            .getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
            .then(function (stream) {
                mediaStream = stream;
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioCtx.createAnalyser();
                analyser.fftSize = 4096;
                analyser.smoothingTimeConstant = 0;
                var source = audioCtx.createMediaStreamSource(stream);
                source.connect(analyser);
                buffer = new Float32Array(analyser.fftSize);
                if (playBtn) {
                    playBtn.classList.add('playing');
                    playBtn.setAttribute('aria-pressed', 'true');
                }
                tick();
            })
            .catch(function () {
                alert('マイクの使用が許可されませんでした。');
            });
    }

    if (playBtn) {
        playBtn.addEventListener('click', function () {
            if (playBtn.classList.contains('playing')) stopMic();
            else startMic();
        });
    }

    if (refSelect) {
        refSelect.addEventListener('change', function () {
            if (smoothFreq > 0) updateUI(smoothFreq, getRefHz());
        });
    }

    window.addEventListener('beforeunload', stopMic);
})();
