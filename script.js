document.addEventListener('DOMContentLoaded', function () {
    // Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navMobile = document.querySelector('.nav-mobile');
    const hamburger = document.querySelector('.hamburger');

    mobileMenuBtn.addEventListener('click', function () {
        navMobile.classList.toggle('active');

        // Animate Hamburger
        if (navMobile.classList.contains('active')) {
            hamburger.style.backgroundColor = 'transparent';
            hamburger.style.transform = 'rotate(0)';
        } else {
            hamburger.style.backgroundColor = 'var(--primary-color)';
        }

        // Simple hamburger to X transformation logic handled via CSS details or simplified here
        // For now, toggle active state is enough for the slide-down menu
    });

    // Close mobile menu when clicking a link
    const mobileLinks = document.querySelectorAll('.nav-mobile a');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMobile.classList.remove('active');
            hamburger.style.backgroundColor = 'var(--primary-color)';
        });
    });

    // Header Scroll Effect
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Smooth Scroll for Anchor Links (polishing standard behavior)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        });
    });

    // Scroll Animation Observer
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Allow animation to play only once
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Add animation classes to elements you want to animate on scroll
    // (Ensure you add specific CSS for .visible state if you used 'opacity: 0' in CSS)
    // For this implementation, the CSS has 'opacity: 0' on .fade-in-up by default? 
    // Wait, the CSS 'fade-in-up' has 'animation' property which runs immediately.
    // Let's modify the behavior to be scroll-triggered for better UX.

    // We will select elements that should animate
    const animateElements = document.querySelectorAll('.fade-in-up, .fade-in-left, .fade-in-right');

    // Quick fix: Remove the default animation from CSS and let JS handle it via a class
    // We'll trust the CSS I wrote initially runs on load, but for elements below fold, 
    // it's better to pause them.
    // For now, let's just observe them.
    const EMAILJS_PUBLIC_KEY = 'Y3xh3lFSEN_vJDdHu';
    const EMAILJS_SERVICE_ID = 'service_kljgbvx';
    const EMAILJS_TEMPLATE_JOIN = 'template_ogrkslu';
    const EMAILJS_TEMPLATE_OTHER = 'template_jzxrbpk';

    if (typeof emailjs !== 'undefined') {
        emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    }

    function setupRecaptchaContactForm(form, templateId) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (typeof grecaptcha === 'undefined' || typeof emailjs === 'undefined') {
                alert('フォームの読み込みに失敗しました。ページを再読み込みしてください。');
                return;
            }
            const recaptchaResponse = grecaptcha.getResponse();
            if (recaptchaResponse.length === 0) {
                alert('ロボットではありません（reCAPTCHA）にチェックを入れてください。');
                return;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalLabel = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = '送信中…';

            emailjs.sendForm(EMAILJS_SERVICE_ID, templateId, form)
                .then(function () {
                    alert('お問い合わせありがとうございます。送信が完了しました。');
                    form.reset();
                })
                .catch(function (err) {
                    console.error('EmailJS error:', err);
                    alert('送信に失敗しました。時間をおいて再度お試しいただくか、shisuitori3@gmail.com までメールでご連絡ください。');
                })
                .finally(function () {
                    grecaptcha.reset();
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalLabel;
                });
        });
    }

    const contactJoinForm = document.getElementById('contactJoinForm');
    if (contactJoinForm) {
        setupRecaptchaContactForm(contactJoinForm, EMAILJS_TEMPLATE_JOIN);
    }
    const contactOtherForm = document.getElementById('contactOtherForm');
    if (contactOtherForm) {
        setupRecaptchaContactForm(contactOtherForm, EMAILJS_TEMPLATE_OTHER);
    }

    // 楽団紹介：練習風景カルーセル（PC の2カラム内で CSS の % 幅が効かず縦積みになる対策）
    (function initPracticeCarousel() {
        const el = document.getElementById('practiceCarousel');
        if (!el) return;

        function applySlideWidth() {
            const w = el.clientWidth;
            if (w < 1) return;
            el.style.setProperty('--slide-w', Math.round(w) + 'px');
        }

        applySlideWidth();
        requestAnimationFrame(function () {
            applySlideWidth();
            requestAnimationFrame(applySlideWidth);
        });

        window.addEventListener('resize', applySlideWidth);

        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(applySlideWidth);
            ro.observe(el);
            const about = el.closest('.about-content');
            if (about) {
                ro.observe(about);
            }
        }
    })();

    // Musical Note Effect
    const createNote = (x, y) => {
        const note = document.createElement('span');
        note.classList.add('musical-note');
        note.style.left = `${x}px`;
        note.style.top = `${y}px`;

        const notes = ['♪', '♫', '♬', '♩'];
        note.innerText = notes[Math.floor(Math.random() * notes.length)];

        // Randomize color slightly
        const colors = ['#b45309', '#d97706', '#0f172a', '#334155'];
        note.style.color = colors[Math.floor(Math.random() * colors.length)];

        // Randomize size
        note.style.fontSize = Math.random() * 1 + 1 + 'rem'; // 1rem to 2rem

        document.body.appendChild(note);

        // Remove after animation
        setTimeout(() => {
            note.remove();
        }, 1000);
    };

    let lastNoteTime = 0;
    const throttleDelay = 100; // ms

    const handleMove = (e) => {
        const now = Date.now();
        if (now - lastNoteTime < throttleDelay) return;

        let x, y;
        if (e.type === 'touchmove') {
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
        } else {
            x = e.clientX;
            y = e.clientY;
        }

        createNote(x, y);
        lastNoteTime = now;
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove);
});
