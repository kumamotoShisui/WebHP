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
    // Contact Form Submission
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Check reCAPTCHA
            const recaptchaResponse = grecaptcha.getResponse();
            if (recaptchaResponse.length === 0) {
                alert('ロボットではありません（reCAPTCHA）にチェックを入れてください。');
                return;
            }

            // Demo Alert
            alert('お問い合わせありがとうございます。\n（これはデモです。実際には送信されていません。）');
            contactForm.reset();
            grecaptcha.reset();
        });
    }

    // Random Image for About Us
    const aboutImage = document.getElementById('aboutImage');
    if (aboutImage) {
        const images = [
            'images/rensyu/S__33079304.jpg',
            'images/rensyu/S__33079305.jpg',
            'images/rensyu/S__33079306.jpg'
        ];
        const randomImage = images[Math.floor(Math.random() * images.length)];
        aboutImage.src = randomImage;
    }

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
