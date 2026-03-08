/**
 * FUI Splash - 4 phase sequence, tap to close
 * 英字は .fui-font-en で GAU Root 適用
 */
(function () {
    var splash = document.getElementById('fui-splash');
    if (!splash) return;

    var phaseWelcome = document.getElementById('fui-phase-welcome');
    var phaseTypewriter = document.getElementById('fui-phase-typewriter');
    var phaseAcronym = document.getElementById('fui-phase-acronym');
    var phaseFinal = document.getElementById('fui-phase-final');
    var typedEl = document.getElementById('fui-typed-text');
    var cursorEl = document.getElementById('fui-cursor');
    var acronymBox = document.getElementById('fui-acronym-box');

    // カスタマイズ用テキスト（フェーズ2の英文）
    var typewriterText = 'Kumamoto City Wind Orchestra — Where Community Meets Music Since 1982.';
    var typewriterDurationMs = 5000;

    function setActive(phaseEl) {
        [phaseWelcome, phaseTypewriter, phaseAcronym, phaseFinal].forEach(function (p) {
            if (p) p.classList.toggle('active', p === phaseEl);
        });
    }

    function runTypewriter(durationMs, done) {
        if (!typedEl) return done();
        var start = performance.now();
        var len = typewriterText.length;

        function tick(now) {
            var elapsed = now - start;
            var progress = Math.min(1, elapsed / durationMs);
            var index = Math.floor(progress * len);
            typedEl.textContent = typewriterText.slice(0, index);

            if (progress >= 1) {
                if (cursorEl) cursorEl.style.display = 'none';
                return done();
            }
            requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    function closeSplash() {
        splash.classList.add('hide');
        document.body.classList.add('splash-done');
    }

    // タップ／クリックで閉じる（フェーズ4のみ、二重発火防止）
    var closed = false;
    function onTap(e) {
        if (closed) return;
        var phase = phaseFinal && phaseFinal.classList.contains('active');
        if (!phase) return;
        closed = true;
        if (e && e.type === 'touchend') e.preventDefault();
        closeSplash();
    }

    splash.addEventListener('click', function (e) {
        if (e.pointerType === 'touch') return; // touchend で処理
        onTap(e);
    });
    splash.addEventListener('touchend', onTap, { passive: false });

    // キーボード対応（Enter/Space で閉じる）
    splash.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.key === ' ') && phaseFinal && phaseFinal.classList.contains('active')) {
            e.preventDefault();
            onTap();
        }
    });

    // シーケンス開始
    setActive(phaseWelcome);

    setTimeout(function () {
        setActive(phaseTypewriter);
        if (cursorEl) cursorEl.style.display = 'inline-block';
        runTypewriter(typewriterDurationMs, function () {
            setActive(phaseAcronym);
            if (acronymBox) acronymBox.classList.add('fade-done');

            setTimeout(function () {
                setActive(phaseFinal);
            }, 1000);
        });
    }, 1000);
})();
