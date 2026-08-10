// =============================================================
// Cosmos Brain — Interactive Visualization
// =============================================================

// =============================================================
// Brand Intro Animation
// =============================================================
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
        const wordElements = []; // track word spans and their spaces

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
            holdMono: 0,
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

            // Resolve 250ms before the animation ends
            if (!earlyResolved && elapsed >= totalDuration - 250) {
                earlyResolved = true;
                resolve();
            }

            // Run one full cycle then stop
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
                    // Each word fades in with overlap — next word starts before previous finishes
                    const wordCount = wordElements.length;
                    const wordDuration = 0.3; // each word takes 30% of total phase
                    const overlap = (wordDuration * wordCount - 1) / (wordCount - 1);
                    const wordStep = (1 - wordDuration) / (wordCount - 1);
                    wordElements.forEach(({ el, spacer }, idx) => {
                        const wordStart = idx * wordStep;
                        const wordEnd = wordStart + wordDuration;
                        let t = 0;
                        if (progress >= wordEnd) t = 1;
                        else if (progress > wordStart) t = easeOutCubic((progress - wordStart) / wordDuration);
                        const opacity = t;
                        const translateY = (1 - t) * -8;
                        el.style.opacity = `${opacity}`;
                        el.style.transform = `translateY(${translateY}px)`;
                        if (spacer) {
                            spacer.style.opacity = `${opacity}`;
                        }
                    });
                    keyLetters.forEach(el => {
                        el.style.fontSize = `${BASE_SIZE}px`;
                    });
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

        // Wait for fonts then start
        document.fonts.ready.then(() => {
            setTimeout(() => {
                BASE_SIZE = parseFloat(getComputedStyle(keyLetters[0]).fontSize);
                monoTargets = getMonogramTargets();
                requestAnimationFrame(animate);
            }, 100);
        });
    });
}

// =============================================================
// Brain Nodes & Config
// =============================================================

const NODES = [
    { id: 'cosmos-ai', label: 'Cosmos AI', size: 'lg', category: 'ai', keywords: ['ai', 'generate', 'create', 'design', 'build', 'compose'] },
    { id: 'agents', label: 'Agents', size: 'md', category: 'ai', keywords: ['agent', 'automate', 'workflow', 'orchestrate', 'build', 'create'] },
    { id: 'skills', label: 'Skills', size: 'md', category: 'ai', keywords: ['skill', 'capability', 'generate', 'write', 'code', 'create'] },
    { id: 'workflows', label: 'Workflows', size: 'md', category: 'process', keywords: ['flow', 'process', 'checkout', 'onboard', 'journey', 'step'] },
    { id: 'ux-patterns', label: 'UX Patterns', size: 'md', category: 'design', keywords: ['ux', 'pattern', 'interaction', 'user', 'experience', 'checkout', 'form'] },
    { id: 'components', label: 'Component Libraries', size: 'md', category: 'design', keywords: ['component', 'button', 'input', 'card', 'modal', 'ui', 'form', 'checkout'] },
    { id: 'brand', label: 'Brand', size: 'md', category: 'brand', keywords: ['brand', 'identity', 'logo', 'style', 'visual', 'look'] },
    { id: 'foundations', label: 'Foundations', size: 'md', category: 'design', keywords: ['color', 'typography', 'spacing', 'grid', 'token', 'foundation'] },
    { id: 'content', label: 'Content Guidelines', size: 'md', category: 'content', keywords: ['content', 'copy', 'writing', 'tone', 'voice', 'guidelines', 'editorial'] },
    { id: 'accessibility', label: 'Accessibility', size: 'md', category: 'engineering', keywords: ['accessibility', 'a11y', 'aria', 'screen reader', 'inclusive', 'wcag'] },
    { id: 'coding-standards', label: 'Coding Standards', size: 'md', category: 'engineering', keywords: ['code', 'standard', 'convention', 'lint', 'frontend', 'engineering', 'best practice'] },
];

// Sub-nodes that appear on hover of parent nodes
const SUB_NODES = {
    'skills': [
        { label: 'Design', labelPos: 'below' },
        { label: 'Content', labelPos: 'above' },
        { label: 'Documentation', labelPos: 'below' },
    ],
    'brand': [
        { label: 'Identity', labelPos: 'below' },
        { label: 'Color', labelPos: 'above' },
        { label: 'Photography', labelPos: 'above' },
        { label: 'Iconography', labelPos: 'above' },
        { label: 'Illustration', labelPos: 'below' },
    ],
};

// Layout positions (percentage-based within the brain container)
const HEADER_HEIGHT = 72;
const NODE_POSITIONS = [
    { x: 45, y: 8 },    // Cosmos AI
    { x: 75, y: 15 },   // Agents
    { x: 20, y: 18 },   // Skills
    { x: 85, y: 38 },   // Workflows
    { x: 12, y: 40 },   // UX Patterns
    { x: 30, y: 65 },   // Component Libraries
    { x: 65, y: 62 },   // Brand
    { x: 78, y: 72 },   // Foundations
    { x: 15, y: 72 },   // Content Guidelines
    { x: 70, y: 82 },   // Accessibility
    { x: 35, y: 82 },   // Coding Standards
];

// Example prompts and their relevant node mappings
const PROMPT_MAPPINGS = [
    {
        keywords: ['checkout', 'flow', 'purchase', 'buy', 'cart', 'payment'],
        nodes: ['cosmos-ai', 'agents', 'workflows', 'ux-patterns', 'components', 'brand', 'foundations', 'accessibility', 'coding-standards'],
        output: 'A complete checkout flow composed from UX patterns, component libraries, brand guidelines, accessibility standards, and coding conventions. AI agents orchestrate the assembly using established workflows.'
    },
    {
        keywords: ['landing', 'page', 'marketing', 'campaign', 'launch'],
        nodes: ['cosmos-ai', 'skills', 'content', 'brand', 'components', 'foundations'],
        output: 'A marketing landing page assembled from brand guidelines, content guidelines, component libraries, and foundations — powered by Cosmos AI skills.'
    },
    {
        keywords: ['onboard', 'signup', 'register', 'welcome', 'first'],
        nodes: ['cosmos-ai', 'agents', 'ux-patterns', 'workflows', 'components', 'brand', 'content', 'accessibility'],
        output: 'An onboarding experience combining UX patterns, workflow orchestration, content guidelines, and accessibility — all aligned to brand identity and composed by AI agents.'
    },
    {
        keywords: ['notification', 'alert', 'message', 'toast'],
        nodes: ['cosmos-ai', 'components', 'ux-patterns', 'accessibility', 'content', 'foundations'],
        output: 'A notification system built from component libraries, accessibility standards, content guidelines, and UX patterns — ensuring consistent user feedback across all touchpoints.'
    },
    {
        keywords: ['design', 'system', 'token', 'theme', 'style'],
        nodes: ['cosmos-ai', 'foundations', 'brand', 'components', 'coding-standards', 'accessibility'],
        output: 'Design system tokens and theming infrastructure composed from foundations, brand, component architecture, coding standards, and accessibility requirements.'
    },
    {
        keywords: ['form', 'input', 'validation', 'field'],
        nodes: ['cosmos-ai', 'components', 'ux-patterns', 'foundations', 'accessibility', 'workflows', 'coding-standards'],
        output: 'Form patterns composed from validated UX patterns, accessible components, coding standards, and interaction workflows — with proper validation and error handling.'
    },
    {
        keywords: ['slide', 'presentation', 'deck', 'pitch', 'keynote', 'powerpoint', 'google slides'],
        nodes: ['cosmos-ai', 'skills', 'content', 'brand', 'foundations', 'components'],
        output: 'A presentation deck assembled from brand guidelines, content strategy, visual foundations, and component patterns — structured by AI skills for maximum impact.'
    },
];

// =============================================================
// App State
// =============================================================
let activeNodes = new Set();
let isProcessing = false;
let currentView = 'brain'; // 'brain', 'wireframes-checkout', 'wireframes-slides'

// =============================================================
// Initialize
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
    renderNodes();
    bindEvents();

    playIntro();
});

function playIntro() {
    // Wordmark is already on screen from brand animation

    // Stagger-load main nodes as dots
    const mainNodes = document.querySelectorAll('.brain-node:not(.static-node)');
    mainNodes.forEach((node, i) => {
        setTimeout(() => {
            node.classList.add('loaded');
        }, 280 + i * 42);
    });

    // Fade in prompt bar midway through main nodes loading
    const promptBar = document.querySelector('.floating-prompt');
    const promptTime = 280 + Math.floor(mainNodes.length * 42 / 2);
    setTimeout(() => {
        promptBar.classList.add('visible');
    }, promptTime);

    // Add pulse to main nodes after they've all loaded
    const pulseStart = 280 + mainNodes.length * 42 + 105;
    mainNodes.forEach((node) => {
        setTimeout(() => {
            node.classList.add('pulsing');
        }, pulseStart);
    });

    // Stagger-load static filler nodes
    const staticNodes = document.querySelectorAll('.brain-node.static-node');
    const staticStart = 280 + mainNodes.length * 28;
    staticNodes.forEach((node, i) => {
        setTimeout(() => {
            node.classList.add('loaded');
        }, staticStart + i * 14);
    });

    // Fade in node labels after all animations complete
    const allAnimsDone = Math.max(pulseStart, staticStart + staticNodes.length * 28) + 300;
    mainNodes.forEach((node, i) => {
        setTimeout(() => {
            node.classList.add('show-label');
        }, allAnimsDone + i * 60);
    });

    // Slide in header after all labels are shown
    const headerTime = allAnimsDone + mainNodes.length * 60 + 200;
    setTimeout(() => {
        document.querySelector('.top-nav').classList.add('visible');
    }, headerTime);
}

function renderNodes() {
    const container = document.getElementById('brainContainer');

    // Render main interactive nodes
    NODES.forEach((node, i) => {
        const el = document.createElement('div');
        el.className = `brain-node size-${node.size}${SUB_NODES[node.id] ? ' has-sub-nodes' : ''}`;
        el.dataset.id = node.id;
        el.dataset.category = node.category;

        const pos = NODE_POSITIONS[i];
        el.style.left = `${pos.x}%`;
        el.style.top = `calc(${pos.y}% * (100vh - ${HEADER_HEIGHT}px) / 100vh + ${HEADER_HEIGHT}px)`;

        el.innerHTML = `<span class="node-label">${node.label}</span>`;
        container.appendChild(el);
    });

    // Render static filler nodes randomly (avoiding logo center)
    const fillerCount = 40;
    for (let i = 0; i < fillerCount; i++) {
        const el = document.createElement('div');
        el.className = 'brain-node static-node';
        let x, y;
        do {
            x = 5 + Math.random() * 90;
            y = 5 + Math.random() * 85;
        } while (x > 40 && x < 60 && y > 40 && y < 60);
        el.style.left = `${x}%`;
        el.style.top = `calc(${y}% * (100vh - ${HEADER_HEIGHT}px) / 100vh + ${HEADER_HEIGHT}px)`;
        container.appendChild(el);
    }
}

function bindEvents() {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
            themeToggle.querySelector('.icon-sun').style.display = isDark ? '' : 'none';
            themeToggle.querySelector('.icon-moon').style.display = isDark ? 'none' : '';
        });
    }

    const submitBtn = document.getElementById('submitPrompt');
    const promptInput = document.getElementById('promptInput');

    if (submitBtn) submitBtn.addEventListener('click', handleSubmit);
    if (promptInput) {
        promptInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
            }
        });
        promptInput.addEventListener('input', () => {
            promptInput.style.height = 'auto';
            promptInput.style.height = Math.min(promptInput.scrollHeight, 120) + 'px';
            // Toggle custom placeholder
            const placeholder = document.getElementById('customPlaceholder');
            if (placeholder) {
                placeholder.classList.toggle('hidden', promptInput.value.length > 0);
            }
        });
    }

    // Microphone speech-to-text
    const micBtn = document.getElementById('micBtn');
    if (micBtn && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        micBtn.addEventListener('click', () => {
            if (micBtn.classList.contains('listening')) {
                recognition.stop();
            } else {
                recognition.start();
                micBtn.classList.add('listening');
            }
        });

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(r => r[0].transcript)
                .join('');
            promptInput.value = transcript;
            promptInput.dispatchEvent(new Event('input'));
        };

        recognition.onend = () => {
            micBtn.classList.remove('listening');
        };

        recognition.onerror = () => {
            micBtn.classList.remove('listening');
        };
    } else if (micBtn) {
        micBtn.style.display = 'none';
    }

    // Wireframe close buttons
    document.querySelectorAll('.wf-close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!isProcessing) {
                transitionFromWireframesToBrain();
            }
        });
    });

    // Node hover interactions
    document.querySelectorAll('.brain-node:not(.static-node)').forEach(node => {
        node.addEventListener('click', () => {
            if (!isProcessing) {
                node.classList.toggle('active');
            }
        });

        node.addEventListener('mouseenter', () => {
            const id = node.dataset.id;
            if (SUB_NODES[id] && !isProcessing) {
                showSubNodes(node, id);
            }
        });
    });
}

let hideSubNodesTimeout = null;

function showSubNodes(parentNode, parentId) {
    // Clear any pending hide
    if (hideSubNodesTimeout) {
        clearTimeout(hideSubNodesTimeout);
        hideSubNodesTimeout = null;
    }

    // Remove any existing sub-nodes for this parent
    hideSubNodes(parentId);

    // Keep parent node in expanded state
    parentNode.classList.add('expanded');

    const subItems = SUB_NODES[parentId];
    const container = document.getElementById('brainContainer');
    const parentRect = parentNode.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const parentX = parentRect.left - containerRect.left + parentRect.width / 2;
    const parentY = parentRect.top - containerRect.top + parentRect.height / 2;

    // Create a hover zone that encompasses parent + sub-nodes
    const hoverZone = document.createElement('div');
    hoverZone.className = 'sub-node-hover-zone';
    hoverZone.dataset.parent = parentId;
    const zoneRadius = 140;
    hoverZone.style.left = `${parentX - zoneRadius}px`;
    hoverZone.style.top = `${parentY - zoneRadius}px`;
    hoverZone.style.width = `${zoneRadius * 2}px`;
    hoverZone.style.height = `${zoneRadius * 2}px`;
    hoverZone.style.borderRadius = '50%';
    container.appendChild(hoverZone);

    hoverZone.addEventListener('mouseleave', () => {
        hideSubNodesTimeout = setTimeout(() => {
            hideSubNodes(parentId);
        }, 150);
    });

    parentNode.addEventListener('mouseleave', (e) => {
        // Only start hide timer if not entering the hover zone
        hideSubNodesTimeout = setTimeout(() => {
            const zone = container.querySelector(`.sub-node-hover-zone[data-parent="${parentId}"]`);
            if (zone && !zone.matches(':hover')) {
                hideSubNodes(parentId);
            }
        }, 150);
    }, { once: true });

    subItems.forEach((item, i) => {
        const el = document.createElement('div');
        el.className = 'brain-node sub-node';
        el.dataset.parent = parentId;
        if (item.labelPos === 'above') {
            el.classList.add('label-above');
        }

        // Spread sub-nodes radially around the parent, avoiding the label zone below (70-110deg)
        const avoidStart = 60;
        const avoidEnd = 120;
        const avoidRange = avoidEnd - avoidStart;
        const availableRange = 360 - avoidRange;
        const step = availableRange / subItems.length;
        const angleDeg = avoidEnd + step * i + step / 2;
        const angleRad = (angleDeg * Math.PI) / 180;
        const radius = 95;

        const x = parentX + Math.cos(angleRad) * radius;
        const y = parentY + Math.sin(angleRad) * radius;

        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.innerHTML = `<span class="node-label">${item.label}</span>`;

        container.appendChild(el);

        // Animate in with stagger
        setTimeout(() => {
            el.classList.add('loaded', 'show-label');
        }, i * 50);

        // Keep sub-nodes visible when hovering them
        el.addEventListener('mouseenter', () => {
            if (hideSubNodesTimeout) {
                clearTimeout(hideSubNodesTimeout);
                hideSubNodesTimeout = null;
            }
        });

        el.addEventListener('mouseleave', () => {
            hideSubNodesTimeout = setTimeout(() => {
                hideSubNodes(parentId);
            }, 150);
        });
    });

    // Draw lines from parent to sub-nodes
    setTimeout(() => {
        const subNodeEls = container.querySelectorAll(`.sub-node[data-parent="${parentId}"]`);
        subNodeEls.forEach((subNode) => {
            const line = document.createElement('div');
            line.className = 'sub-node-line';
            line.dataset.parent = parentId;

            const subRect = subNode.getBoundingClientRect();
            const sx = subRect.left - containerRect.left + subRect.width / 2;
            const sy = subRect.top - containerRect.top + subRect.height / 2;

            const dx = sx - parentX;
            const dy = sy - parentY;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            line.style.left = `${parentX}px`;
            line.style.top = `${parentY}px`;
            line.style.width = `${length}px`;
            line.style.transform = `rotate(${angle}deg)`;

            container.appendChild(line);
            requestAnimationFrame(() => {
                line.classList.add('visible');
            });
        });
    }, 50);
}

function hideSubNodes(parentId) {
    if (hideSubNodesTimeout) {
        clearTimeout(hideSubNodesTimeout);
        hideSubNodesTimeout = null;
    }
    const container = document.getElementById('brainContainer');
    // Remove expanded state from parent
    const parentNode = container.querySelector(`.brain-node[data-id="${parentId}"]`);
    if (parentNode) parentNode.classList.remove('expanded');
    container.querySelectorAll(`.sub-node[data-parent="${parentId}"]`).forEach(el => el.remove());
    container.querySelectorAll(`.sub-node-line[data-parent="${parentId}"]`).forEach(el => el.remove());
    container.querySelectorAll(`.sub-node-hover-zone[data-parent="${parentId}"]`).forEach(el => el.remove());
}

// =============================================================
// Prompt Processing
// =============================================================
async function handleSubmit() {
    if (isProcessing) return;

    const promptEl = document.getElementById('promptInput');
    const input = promptEl ? promptEl.value.trim() : '';
    if (!input) return;

    isProcessing = true;

    // Dock the prompt bar to the bottom
    document.querySelector('.floating-prompt').classList.add('docked');

    // If wireframes are currently showing, transition back to brain first
    if (currentView === 'wireframes-checkout' || currentView === 'wireframes-slides') {
        await transitionFromWireframesToBrain();
    } else {
        resetState();
    }

    // Show loading spinner on button
    const submitBtn = document.getElementById('submitPrompt');
    submitBtn.classList.add('loading');

    // Thinking delay
    const logo = document.querySelector('.brand-text-container');
    await delay(1500);

    // Fade logo
    if (logo) logo.classList.add('dimmed');
    submitBtn.classList.remove('loading');

    // Activate brain
    const container = document.getElementById('brainContainer');
    container.classList.add('active');

    // Determine which nodes to activate
    const matchedNodes = matchPromptToNodes(input);
    const matchedOutput = matchPromptToOutput(input);

    // Staggered node activation
    await activateNodesSequentially(matchedNodes);

    // Show output
    await delay(600);
    showOutput(matchedOutput, matchedNodes);

    // Hold connected state for 3 seconds
    await delay(3000);

    // Gravity drop everything except the search bar
    gravityDrop();

    // Determine which wireframe to show based on prompt
    await delay(1000);
    if (matchesSlidesPrompt(input)) {
        showSlidesWireframes();
        currentView = 'wireframes-slides';
    } else {
        showWireframeFlows();
        currentView = 'wireframes-checkout';
    }

    await delay(2000);
    document.getElementById('brainContainer').classList.remove('active');
    isProcessing = false;
}

function matchesSlidesPrompt(input) {
    const words = input.toLowerCase();
    const slideKeywords = ['slide', 'presentation', 'deck', 'pitch', 'keynote', 'powerpoint', 'google slides'];
    return slideKeywords.some(kw => words.includes(kw));
}

async function transitionFromWireframesToBrain() {
    // Gravity drop wireframes out the bottom
    const wireframes = document.getElementById('wireframeFlows');
    const slidesWireframes = document.getElementById('slidesWireframeFlows');

    const activeWireframe = currentView === 'wireframes-slides' ? slidesWireframes : wireframes;
    if (activeWireframe) {
        const screens = activeWireframe.querySelectorAll('.wireframe-screen');
        screens.forEach((el, i) => {
            const randomDelay = i * 80;
            const randomRotation = (Math.random() - 0.5) * 20;
            el.style.transition = `transform 0.8s cubic-bezier(0.55, 0, 1, 0.45) ${randomDelay}ms, opacity 0.6s ease ${randomDelay + 400}ms`;
            el.style.setProperty('transform', `translateY(${window.innerHeight + 200}px) rotate(${randomRotation}deg)`, 'important');
            el.style.opacity = '0';
        });
    }

    await delay(1000);

    // Hide wireframe containers
    if (wireframes) {
        wireframes.classList.add('hidden');
        wireframes.classList.remove('visible');
        wireframes.querySelectorAll('.wireframe-screen').forEach(el => {
            el.style.transition = '';
            el.style.transform = '';
            el.style.opacity = '';
        });
    }
    if (slidesWireframes) {
        slidesWireframes.classList.add('hidden');
        slidesWireframes.classList.remove('visible');
        slidesWireframes.querySelectorAll('.wireframe-screen').forEach(el => {
            el.style.transition = '';
            el.style.transform = '';
            el.style.opacity = '';
        });
    }

    // Bring brain nodes back from the top with gravity
    resetState();
    const nodes = document.querySelectorAll('.brain-node');
    const brandOverlay = document.getElementById('brandIntroOverlay');

    // Position everything above screen first
    const elements = [...nodes];
    if (brandOverlay) elements.push(brandOverlay);

    elements.forEach(el => {
        el.style.transition = 'none';
        el.style.setProperty('transform', `translateY(${-window.innerHeight - 200}px)`, 'important');
        el.style.opacity = '1';
        el.offsetHeight; // force reflow
    });

    // Animate them falling down into place
    elements.forEach((el, i) => {
        const randomDelay = Math.random() * 300;
        el.style.transition = `transform 0.7s cubic-bezier(0.33, 0, 0.67, 1) ${randomDelay}ms, opacity 0.3s ease`;
        el.style.setProperty('transform', 'translateY(0)', 'important');
    });

    await delay(1200);

    // Clean up inline styles
    elements.forEach(el => {
        el.style.transition = '';
        el.style.removeProperty('transform');
        el.style.opacity = '';
    });

    currentView = 'brain';
}

function matchPromptToNodes(input) {
    const words = input.toLowerCase().split(/\s+/);
    let bestMatch = null;
    let bestScore = 0;

    // Check predefined mappings
    PROMPT_MAPPINGS.forEach(mapping => {
        const score = mapping.keywords.reduce((acc, kw) => {
            return acc + (words.some(w => w.includes(kw) || kw.includes(w)) ? 1 : 0);
        }, 0);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = mapping;
        }
    });

    if (bestMatch && bestScore > 0) {
        return bestMatch.nodes;
    }

    // Fallback: match nodes by their own keywords
    const matched = [];
    NODES.forEach(node => {
        const nodeScore = node.keywords.reduce((acc, kw) => {
            return acc + (words.some(w => w.includes(kw) || kw.includes(w)) ? 1 : 0);
        }, 0);
        if (nodeScore > 0) {
            matched.push(node.id);
        }
    });

    // Always include Cosmos AI
    if (!matched.includes('cosmos-ai')) matched.unshift('cosmos-ai');

    return matched.length > 1 ? matched : NODES.slice(0, 6).map(n => n.id);
}

function matchPromptToOutput(input) {
    const words = input.toLowerCase().split(/\s+/);
    let bestMatch = null;
    let bestScore = 0;

    PROMPT_MAPPINGS.forEach(mapping => {
        const score = mapping.keywords.reduce((acc, kw) => {
            return acc + (words.some(w => w.includes(kw) || kw.includes(w)) ? 1 : 0);
        }, 0);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = mapping;
        }
    });

    if (bestMatch && bestScore > 0) {
        return bestMatch.output;
    }

    return `A composed solution assembled from Cosmos components, AI agents, and design system elements — tailored to your specific request and orchestrated through intelligent workflows.`;
}

async function activateNodesSequentially(nodeIds) {
    // Stop all bouncing animations
    document.querySelectorAll('.brain-node.pulsing').forEach(n => {
        n.classList.remove('pulsing');
    });

    // First, highlight selected nodes in red
    for (let i = 0; i < nodeIds.length; i++) {
        const nodeEl = document.querySelector(`.brain-node[data-id="${nodeIds[i]}"]`);
        if (nodeEl) {
            nodeEl.classList.add('highlighted');
        }
        await delay(100 + Math.random() * 80);
    }

    // Hold the red highlight
    await delay(800);

    // Transition from highlighted to active
    for (let i = 0; i < nodeIds.length; i++) {
        const nodeEl = document.querySelector(`.brain-node[data-id="${nodeIds[i]}"]`);
        if (nodeEl) {
            nodeEl.classList.add('active');
            activeNodes.add(nodeIds[i]);
            spawnParticles(nodeEl);
        }
    }

    // Fade out inactive nodes
    document.querySelectorAll('.brain-node:not(.active)').forEach(n => {
        n.classList.add('dimmed');
    });

    // Rearrange active nodes into a cluster
    await delay(400);
    rearrangeActiveNodes(nodeIds);

    // Push unused nodes to the edges
    pushInactiveNodesToEdges(nodeIds);
}

function rearrangeActiveNodes(nodeIds) {
    const container = document.getElementById('brainContainer');
    const containerRect = container.getBoundingClientRect();

    // Available space: full viewport minus header and search bar
    const searchBarHeight = 80;
    const availableWidth = containerRect.width;
    const availableHeight = containerRect.height - searchBarHeight - HEADER_HEIGHT;
    const padding = 60;

    const centerX = availableWidth / 2;
    const centerY = HEADER_HEIGHT + availableHeight / 2;
    const count = nodeIds.length;

    // Place nodes organically around center
    const baseRadius = Math.min(centerX, centerY) * 0.55;
    const positions = [];

    nodeIds.forEach((id, i) => {
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
        const radiusVariation = baseRadius + (Math.random() - 0.5) * baseRadius * 0.4;
        const angleJitter = (Math.random() - 0.5) * 0.3;

        const x = centerX + Math.cos(angle + angleJitter) * radiusVariation;
        const y = centerY + Math.sin(angle + angleJitter) * radiusVariation;
        positions.push({ x, y });
    });

    // Find bounding box of the laid-out positions
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    positions.forEach(({ x, y }) => {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y + 20); // +label space
    });

    const clusterWidth = maxX - minX || 1;
    const clusterHeight = maxY - minY || 1;

    // Scale positions to fill available space
    const scaleX = (availableWidth - padding * 2) / clusterWidth;
    const scaleY = (availableHeight - padding * 2) / clusterHeight;
    const scale = Math.min(scaleX, scaleY, 3);

    const clusterCenterX = (minX + maxX) / 2;
    const clusterCenterY = (minY + maxY) / 2;
    const targetCenterX = availableWidth / 2;
    const targetCenterY = HEADER_HEIGHT + availableHeight / 2;

    nodeIds.forEach((id, i) => {
        const nodeEl = document.querySelector(`.brain-node[data-id="${id}"]`);
        if (!nodeEl) return;

        const finalX = targetCenterX + (positions[i].x - clusterCenterX) * scale;
        const finalY = targetCenterY + (positions[i].y - clusterCenterY) * scale;

        nodeEl.style.left = `${finalX}px`;
        nodeEl.style.top = `${finalY}px`;
        nodeEl.classList.add('reveal-label');
    });

    // Draw connections after nodes have transitioned
    setTimeout(() => drawConnections(nodeIds), 1100);
}

function pushInactiveNodesToEdges(activeNodeIds) {
    const container = document.getElementById('brainContainer');
    const containerRect = container.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;

    // Find bounding box of active nodes to define exclusion zone
    let aMinX = Infinity, aMinY = Infinity, aMaxX = -Infinity, aMaxY = -Infinity;
    activeNodeIds.forEach(id => {
        const el = document.querySelector(`.brain-node[data-id="${id}"]`);
        if (!el) return;
        const x = parseFloat(el.style.left);
        const y = parseFloat(el.style.top);
        aMinX = Math.min(aMinX, x);
        aMinY = Math.min(aMinY, y);
        aMaxX = Math.max(aMaxX, x + 20);
        aMaxY = Math.max(aMaxY, y + 30);
    });

    // Add margin around the exclusion zone
    const margin = 40;
    const exLeft = aMinX - margin;
    const exRight = aMaxX + margin;
    const exTop = aMinY - margin;
    const exBottom = aMaxY + margin;

    const inactiveNodes = document.querySelectorAll('.brain-node.dimmed:not(.static-node)');
    const edgePadding = 50;

    inactiveNodes.forEach((node) => {
        let x, y;
        let attempts = 0;

        // Generate random positions outside the exclusion zone
        do {
            x = edgePadding + Math.random() * (width - edgePadding * 2);
            y = HEADER_HEIGHT + edgePadding + Math.random() * (height - HEADER_HEIGHT - edgePadding * 2 - 80);
            attempts++;
        } while (
            x > exLeft && x < exRight &&
            y > exTop && y < exBottom &&
            attempts < 50
        );

        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
    });
}

function drawConnections(nodeIds) {
    const svg = document.getElementById('connectionsSvg');
    const container = document.getElementById('brainContainer');
    const containerRect = container.getBoundingClientRect();

    svg.innerHTML = '';

    // Get center positions of all active nodes
    const positions = [];
    nodeIds.forEach(id => {
        const nodeEl = document.querySelector(`.brain-node[data-id="${id}"]`);
        if (!nodeEl) return;
        const rect = nodeEl.getBoundingClientRect();
        positions.push({
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top + rect.height / 2
        });
    });

    // Connect each node to its neighbors in the circle
    for (let i = 0; i < positions.length; i++) {
        const next = (i + 1) % positions.length;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', positions[i].x);
        line.setAttribute('y1', positions[i].y);
        line.setAttribute('x2', positions[next].x);
        line.setAttribute('y2', positions[next].y);
        line.classList.add('connection-line');
        svg.appendChild(line);

        // Stagger line appearance
        setTimeout(() => line.classList.add('visible'), i * 80);
    }

    // Also connect a few cross-links for a networked feel
    if (positions.length > 4) {
        for (let i = 0; i < Math.min(positions.length - 2, 4); i++) {
            const from = i;
            const to = (i + Math.floor(positions.length / 3)) % positions.length;
            if (from === to) continue;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', positions[from].x);
            line.setAttribute('y1', positions[from].y);
            line.setAttribute('x2', positions[to].x);
            line.setAttribute('y2', positions[to].y);
            line.classList.add('connection-line', 'cross-link');
            svg.appendChild(line);

            setTimeout(() => line.classList.add('visible'), (positions.length + i) * 80);
        }
    }
}

function showOutput(text, nodeIds) {
    const outputPanel = document.getElementById('outputPanel');
    const outputContent = document.getElementById('outputContent');
    const outputNodesContainer = document.getElementById('outputNodes');

    if (!outputPanel || !outputContent || !outputNodesContainer) return;

    outputContent.textContent = text;
    outputNodesContainer.innerHTML = '';

    // Create node tags
    nodeIds.forEach(id => {
        const node = NODES.find(n => n.id === id);
        if (node) {
            const tag = document.createElement('span');
            tag.className = 'output-node-tag';
            tag.textContent = node.label;
            outputNodesContainer.appendChild(tag);
        }
    });

    // Animate in
    outputPanel.classList.remove('hidden');
    outputPanel.classList.add('visible');

    // Stagger tag appearance
    const tags = outputNodesContainer.querySelectorAll('.output-node-tag');
    tags.forEach((tag, i) => {
        setTimeout(() => tag.classList.add('visible'), i * 80);
    });
}

// =============================================================
// Visual Effects
// =============================================================
function gravityDrop() {
    // Collect all elements to drop (everything except the search bar)
    const nodes = document.querySelectorAll('.brain-node');
    const svg = document.getElementById('connectionsSvg');
    const brandOverlay = document.getElementById('brandIntroOverlay');

    // Remove classes that use !important on transform
    nodes.forEach(node => {
        node.classList.remove('highlighted', 'active', 'expanded', 'pulsing');
    });

    const elements = [...nodes];
    if (svg) elements.push(svg);
    if (brandOverlay) elements.push(brandOverlay);

    elements.forEach((el, i) => {
        const randomDelay = Math.random() * 300;
        const randomRotation = (Math.random() - 0.5) * 45;
        
        el.style.transition = 'none';
        el.offsetHeight; // force reflow
        el.style.transition = `transform 0.8s cubic-bezier(0.55, 0, 1, 0.45) ${randomDelay}ms, opacity 0.6s ease ${randomDelay + 400}ms`;
        el.style.setProperty('transform', `translateY(${window.innerHeight + 200}px) rotate(${randomRotation}deg)`, 'important');
        el.style.opacity = '0';
    });
}

function showWireframeFlows() {
    const flows = document.getElementById('wireframeFlows');
    flows.classList.remove('hidden');
    // Trigger reflow before adding visible class
    flows.offsetHeight;
    flows.classList.add('visible');
}

function showSlidesWireframes() {
    const flows = document.getElementById('slidesWireframeFlows');
    flows.classList.remove('hidden');
    flows.offsetHeight;
    flows.classList.add('visible');
}

function spawnParticles(nodeEl) {
    const rect = nodeEl.getBoundingClientRect();
    const container = document.querySelector('.brain-container');

    for (let i = 0; i < 4; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${rect.left - container.getBoundingClientRect().left + rect.width / 2 + (Math.random() - 0.5) * 30}px`;
        particle.style.top = `${rect.top - container.getBoundingClientRect().top + rect.height / 2 + (Math.random() - 0.5) * 30}px`;
        container.appendChild(particle);

        setTimeout(() => particle.classList.add('active'), i * 50);
        setTimeout(() => particle.remove(), 2500);
    }
}

function animateIdleState() {
    // Subtle floating animation for nodes
    const nodes = document.querySelectorAll('.brain-node');
    nodes.forEach((node, i) => {
        const duration = 3 + Math.random() * 2;
        const delay = Math.random() * 2;
        node.style.animation = `idleFloat ${duration}s ease-in-out ${delay}s infinite`;
    });

    // Add idle keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes idleFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-4px); }
        }
        .brain-node.active {
            animation: nodePulse 1.5s ease-in-out infinite !important;
        }
    `;
    document.head.appendChild(style);
}

// =============================================================
// Utilities
// =============================================================
function resetState() {
    activeNodes.clear();

    // Restore logo
    const logo = document.querySelector('.brand-text-container');
    if (logo) logo.classList.remove('dimmed');

    // Reset cluster zoom
    document.querySelectorAll('.brain-node.active').forEach(n => {
        n.style.transform = '';
    });
    const svg = document.getElementById('connectionsSvg');
    if (svg) {
        svg.style.transform = '';
        svg.style.transformOrigin = '';
    }

    // Reset node states and positions
    NODES.forEach((node, i) => {
        const el = document.querySelector(`.brain-node[data-id="${node.id}"]`);
        if (!el) return;
        el.classList.remove('active', 'dimmed', 'reveal-label', 'highlighted');
        const pos = NODE_POSITIONS[i];
        el.style.left = `${pos.x}%`;
        el.style.top = `calc(${pos.y}% * (100vh - ${HEADER_HEIGHT}px) / 100vh + ${HEADER_HEIGHT}px)`;
    });

    // Also show static nodes again
    document.querySelectorAll('.brain-node.static-node').forEach(n => {
        n.classList.remove('dimmed');
    });

    // Clear connection lines
    svg.innerHTML = '';
    svg.style.transition = '';
    svg.style.removeProperty('transform');
    svg.style.opacity = '';

    const outputPanel = document.getElementById('outputPanel');
    if (outputPanel) {
        outputPanel.classList.remove('visible');
        outputPanel.classList.add('hidden');
    }
    document.querySelectorAll('.output-node-tag').forEach(t => t.classList.remove('visible'));
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
