// Cosmos Brand Intro Animation
function playBrandIntro() {
    return new Promise((resolve) => {
        const words = [
            { text: 'A', hasComma: false, keyIndex: -1, italic: false },
            { text: 'cohesive,', hasComma: false, keyIndex: 0, italic: false },
            { text: 'orderly,', hasComma: false, keyIndex: 0, italic: false },
            { text: 'selective,', hasComma: false, keyIndex: 0, italic: false },
            { text: 'and', hasComma: false, keyIndex: -1, italic: false },
            { text: 'modular', hasComma: false, keyIndex: 0, italic: false },
            { text: 'operating', hasComma: false, keyIndex: 0, italic: true },
            { text: 'system', hasComma: false, keyIndex: 0, italic: true },
        ];

        const container = document.getElementById('brandTextContainer');
        const keyLetters = [];
        const nonKeyElements = [];
        const wordElements = [];

        words.forEach((word, wordIdx) => {
            const wordEl = document.createElement('span');
            wordEl.className = 'word';
            let spacer = null;
            if (wordIdx > 0) {
                spacer = document.createElement('span');
                spacer.className = 'space';
                container.appendChild(spacer);
                nonKeyElements.push(spacer);
            }
            for (let i = 0; i < word.text.length; i++) {
                const ch = word.text[i];
                if (ch === ',') {
                    const cm = document.createElement('span');
                    cm.className = 'comma';
                    if (word.italic) cm.classList.add('italic');
                    cm.textContent = ch;
                    wordEl.appendChild(cm);
                    nonKeyElements.push(cm);
                } else {
                    const el = document.createElement('span');
                    el.className = 'letter';
                    if (word.italic) el.classList.add('italic');
                    el.textContent = ch;
                    if (i === word.keyIndex) {
                        el.classList.add('key-letter');
                        keyLetters.push(el);
                    } else {
                        nonKeyElements.push(el);
                    }
                    wordEl.appendChild(el);
                }
            }
            container.appendChild(wordEl);
            wordElements.push({ el: wordEl, spacer: spacer });
        });

        function shuffle(arr) {
            const a = [...arr];
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        }

        function buildStaggerTimes(count, fadeOverlap) {
            const times = [];
            let acc = 0;
            const decay = 0.93;
            for (let i = 0; i < count; i++) {
                times.push(acc);
                acc += Math.pow(decay, i);
            }
            const maxStart = 1.0 - fadeOverlap;
            return times.map(t => (t / acc) * maxStart);
        }

        const fadeOutOrder = shuffle(nonKeyElements.map((_, i) => i));
        const FADE_OVERLAP = 0.18;
        const staggerTimes = buildStaggerTimes(nonKeyElements.length, FADE_OVERLAP);

        function easeOutCubic(t) { return 1 - Math.pow(1 - t, 5); }
        function easeInOutCubic(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }
        function lerp(a, b, t) { return a + (b - a) * t; }

        function getMonogramTargets() {
            const canvasRect = document.querySelector('.brand-canvas').getBoundingClientRect();
            const textRect = document.querySelector('.brand-text-container').getBoundingClientRect();
            const cx = canvasRect.left + canvasRect.width / 2;
            const cy = textRect.top + textRect.height / 2;
            const spacing = -0.25;
            let totalW = 0;
            const widths = keyLetters.map(el => {
                const w = el.getBoundingClientRect().width;
                totalW += w;
                return w;
            });
            totalW += spacing * (keyLetters.length - 1);
            let x = cx - totalW / 2;
            return keyLetters.map((el, i) => {
                const r = el.getBoundingClientRect();
                const targetCenterX = x + widths[i] / 2;
                const currentCenterX = r.left + r.width / 2;
                const targetCenterY = cy;
                const currentCenterY = r.top + r.height / 2;
                x += widths[i] + spacing;
                return {
                    x: targetCenterX - currentCenterX,
                    y: targetCenterY - currentCenterY
                };
            });
        }

        const TIMING = {
            wordFadeIn: 1200,
            hold1: 2800,
            fadeOut: 1400,
            holdRevealed: 625,
            condense: 300,
            holdMono: 1000,
        };

        const phases = [];
        let totalDuration = 0;
        const order = ['wordFadeIn','hold1','fadeOut','holdRevealed','condense','holdMono'];
        order.forEach(name => {
            phases.push({ start: totalDuration, duration: TIMING[name], name });
            totalDuration += TIMING[name];
        });

        let monoTargets = null;
        let BASE_SIZE = 38;
        let animStart = 0;
        let animDone = false;
        let earlyResolved = false;

        function animate(timestamp) {
            if (!animStart) animStart = timestamp;
            const elapsed = timestamp - animStart;

            if (!earlyResolved && elapsed >= totalDuration - 250) {
                earlyResolved = true;
                resolve();
            }

            if (elapsed >= totalDuration) {
                if (!animDone) {
                    animDone = true;
                }
                return;
            }

            const loopTime = elapsed;
            let phase = null, progress = 0;
            for (let i = phases.length - 1; i >= 0; i--) {
                if (loopTime >= phases[i].start) {
                    phase = phases[i];
                    progress = Math.min(1, (loopTime - phase.start) / phase.duration);
                    break;
                }
            }
            if (!phase) { requestAnimationFrame(animate); return; }

            switch (phase.name) {
                case 'wordFadeIn': {
                    const wordCount = wordElements.length;
                    const wordDuration = 0.3;
                    const wordStep = (1 - wordDuration) / (wordCount - 1);
                    wordElements.forEach(({ el, spacer }, idx) => {
                        const wordStart = idx * wordStep;
                        const wordEnd = wordStart + wordDuration;
                        let t = 0;
                        if (progress >= wordEnd) t = 1;
                        else if (progress > wordStart) t = easeOutCubic((progress - wordStart) / wordDuration);
                        el.style.opacity = `${t}`;
                        el.style.transform = `translateY(${(1 - t) * -8}px)`;
                        if (spacer) spacer.style.opacity = `${t}`;
                    });
                    keyLetters.forEach(el => { el.style.fontSize = `${BASE_SIZE}px`; });
                    break;
                }

                case 'hold1':
                    wordElements.forEach(({ el, spacer }) => {
                        el.style.opacity = '1';
                        el.style.transform = 'translateY(0)';
                        if (spacer) spacer.style.opacity = '1';
                    });
                    nonKeyElements.forEach(el => { el.style.opacity = '1'; });
                    keyLetters.forEach(el => {
                        el.style.transform = 'translate(0, 0)';
                        el.style.fontSize = `${BASE_SIZE}px`;
                    });
                    break;

                case 'fadeOut':
                    fadeOutOrder.forEach((elIdx, orderPos) => {
                        const start = staggerTimes[orderPos];
                        const end = start + FADE_OVERLAP;
                        let t = 0;
                        if (progress >= end) t = 1;
                        else if (progress > start) t = easeInOutCubic((progress - start) / FADE_OVERLAP);
                        nonKeyElements[elIdx].style.opacity = `${1 - t}`;
                    });
                    keyLetters.forEach(el => {
                        el.style.transform = 'translate(0, 0)';
                        el.style.fontSize = `${BASE_SIZE}px`;
                    });
                    break;

                case 'holdRevealed':
                    nonKeyElements.forEach(el => { el.style.opacity = '0'; });
                    keyLetters.forEach(el => {
                        el.style.transform = 'translate(0, 0)';
                        el.style.fontSize = `${BASE_SIZE}px`;
                    });
                    break;

                case 'condense': {
                    const t = easeOutCubic(progress);
                    nonKeyElements.forEach(el => { el.style.opacity = '0'; });
                    keyLetters.forEach((el, i) => {
                        const tx = lerp(0, monoTargets[i].x, t);
                        const ty = lerp(0, monoTargets[i].y, t);
                        el.style.transform = `translate(${tx}px, ${ty}px)`;
                        el.style.fontSize = `${BASE_SIZE}px`;
                    });
                    break;
                }

                case 'holdMono':
                    nonKeyElements.forEach(el => { el.style.opacity = '0'; });
                    keyLetters.forEach((el, i) => {
                        el.style.transform = `translate(${monoTargets[i].x}px, ${monoTargets[i].y}px)`;
                        el.style.fontSize = `${BASE_SIZE}px`;
                    });
                    break;
            }

            requestAnimationFrame(animate);
        }

        document.fonts.ready.then(() => {
            setTimeout(() => {
                BASE_SIZE = parseFloat(getComputedStyle(keyLetters[0]).fontSize);
                monoTargets = getMonogramTargets();
                requestAnimationFrame(animate);
            }, 100);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('cosmos-intro-played')) {
        document.getElementById('brandIntroOverlay').style.display = 'none';
        document.querySelector('.top-nav').classList.add('visible');
        document.getElementById('comingSoon').classList.add('visible');
        return;
    }
    playBrandIntro().then(() => {
        sessionStorage.setItem('cosmos-intro-played', '1');
        const overlay = document.getElementById('brandIntroOverlay');
        overlay.style.transition = 'opacity 0.6s ease';
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
            document.querySelector('.top-nav').classList.add('visible');
            document.getElementById('comingSoon').classList.add('visible');
        }, 600);
    });
});
