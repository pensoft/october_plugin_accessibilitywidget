/*!
 * Accessibility widget: self-hosted replacement for the UserWay widget.
 *
 * No dependencies, no external requests. Each visitor's settings are kept in
 * their own browser (localStorage) and applied again on every page.
 *
 * Include in the <head> (without defer, so saved settings apply before first paint):
 *   <link rel="stylesheet" href=".../a11y-widget.css">
 *   <script src=".../a11y-widget.js" data-position="right"></script>
 *
 * Optional attributes on the <script> tag:
 *   data-position  "right" (default) or "left"
 *   data-color     button / accent colour, e.g. "#313131"
 *   data-offset-x  distance of the button from the side, in px (default 20)
 *   data-offset-y  distance of the button from the bottom, in px (default 20)
 *   data-hide      comma-separated feature ids to leave out, e.g. "speech,cursor"
 *                  ("structure" hides the Page structure button)
 */
(function () {
    'use strict';

    if (window.A11yWidget) return;

    var STORE_KEY = 'a11yw-settings-v1';
    var root = document.documentElement;
    var script = document.currentScript;
    var cfg = {
        position: (script && script.getAttribute('data-position')) === 'left' ? 'left' : 'right',
        color: script && script.getAttribute('data-color'),
        offsetX: parseInt(script && script.getAttribute('data-offset-x'), 10),
        offsetY: parseInt(script && script.getAttribute('data-offset-y'), 10),
        hide: ((script && script.getAttribute('data-hide')) || '').split(',').map(function (s) { return s.trim(); })
    };

    var hasSpeech = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

    var ICONS = {
        toggle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.2" r="2.1" fill="currentColor" stroke="none"/><path d="M4 8.5l8 1.6 8-1.6M12 10.1v4.6M12 14.7l-3.6 6.6M12 14.7l3.6 6.6"/></svg>',
        close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
        back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
        contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor"/>',
        links: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
        textsize: '<path d="M3 7V5h10v2M8 5v14M6 19h4"/><path d="M14 12v-1.5h7V12M17.5 10.5V19M16 19h3"/>',
        spacing: '<path d="M3 12h18M6 8.5L2.5 12 6 15.5M18 8.5l3.5 3.5-3.5 3.5"/>',
        lineheight: '<path d="M11 6h10M11 12h10M11 18h10M5 4v16M2.5 6.5L5 4l2.5 2.5M2.5 17.5L5 20l2.5-2.5"/>',
        font: '<path d="M3 19L8.5 5h1L15 19M5.5 14h7"/><circle cx="18.5" cy="16" r="2.5"/><path d="M21 12v7"/>',
        saturation: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M12 20a6 6 0 0 1-6-6" />',
        images: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M21 16l-5-5-8 8M3 3l18 18"/>',
        animations: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
        cursor: '<path d="M5 3l14 8.2-6.2 1.4L9.6 19z"/>',
        guide: '<rect x="3" y="10" width="18" height="4" rx="1"/><path d="M5 6h14M5 18h14"/>',
        focus: '<rect x="3.5" y="3.5" width="17" height="17" rx="3" stroke-dasharray="3 2.5"/><rect x="8" y="8" width="8" height="8" rx="1.5"/>',
        speech: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/>',
        structure: '<path d="M4 5h4M4 12h4M4 19h4M11 5h9M13 12h7M13 19h7"/>',
        reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/>'
    };

    /* Each feature has 0 (off) plus one entry per level in `levels`.
       Levels are applied as the class a11yw-<id>-<n> on <html>; CSS does the rest,
       except where a JS hook is listed in APPLY below. */
    var FEATURES = [
        { id: 'contrast', label: 'Contrast', levels: ['Invert colours', 'Dark contrast', 'Light contrast'] },
        { id: 'links', label: 'Highlight links', levels: ['On'] },
        { id: 'textsize', label: 'Bigger text', levels: ['110%', '125%', '150%', '175%'], scale: [1.1, 1.25, 1.5, 1.75] },
        { id: 'spacing', label: 'Text spacing', levels: ['Light', 'Moderate', 'Heavy'] },
        { id: 'animations', label: 'Pause animations', levels: ['On'] },
        { id: 'images', label: 'Hide images', levels: ['On'] },
        { id: 'font', label: 'Readable font', levels: ['Legible', 'Dyslexia friendly'] },
        { id: 'cursor', label: 'Big cursor', levels: ['Black', 'White'] },
        { id: 'guide', label: 'Reading guide', levels: ['Reading line', 'Reading mask'] },
        { id: 'lineheight', label: 'Line height', levels: ['1.5×', '1.75×', '2×'] },
        { id: 'saturation', label: 'Saturation', levels: ['Low', 'High', 'Greyscale'] },
        { id: 'focus', label: 'Highlight focus', levels: ['On'] }
    ];
    if (hasSpeech) {
        FEATURES.push({ id: 'speech', label: 'Read aloud', levels: ['Normal speed', 'Fast', 'Slow'], rate: [1, 1.4, 0.75] });
    }

    FEATURES = FEATURES.filter(function (f) { return cfg.hide.indexOf(f.id) === -1; });

    var byId = {};
    FEATURES.forEach(function (f) { byId[f.id] = f; });

    /* ---------- state ---------- */

    var state = load();

    function load() {
        var s = {};
        try {
            var raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
            FEATURES.forEach(function (f) {
                var v = parseInt(raw[f.id], 10);
                s[f.id] = v > 0 && v <= f.levels.length ? v : 0;
            });
        } catch (e) {
            FEATURES.forEach(function (f) { s[f.id] = 0; });
        }
        return s;
    }

    function save() {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* private mode etc. */ }
    }

    /* ---------- applying settings ---------- */

    function applyClasses() {
        FEATURES.forEach(function (f) {
            for (var i = 1; i <= f.levels.length; i++) {
                root.classList.toggle('a11yw-' + f.id + '-' + i, state[f.id] === i);
            }
        });
    }

    // filter is composed on <html> because invert and saturation both need it.
    // A filter on the root element does not break position:fixed descendants.
    function applyFilter() {
        var parts = [];
        if (state.contrast === 1) parts.push('invert(1) hue-rotate(180deg)');
        var sat = { 1: 'saturate(0.5)', 2: 'saturate(1.8)', 3: 'grayscale(1)' }[state.saturation];
        if (sat) parts.push(sat);
        root.style.filter = parts.join(' ');
    }

    /* Text scaling. The site uses px sizes, so a root font-size change would not
       reach most text. Instead each element that carries text gets an inline
       font-size (and px line-height) of original × factor. Originals are kept so the
       page can be restored exactly. */
    var scaled = new Map();
    var SKIP_TAGS = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|BR|HR|IMG|SVG|PATH|IFRAME|VIDEO|AUDIO|CANVAS|OBJECT|HEAD|META|LINK)$/;

    function resetScale() {
        scaled.forEach(function (orig, el) {
            restoreProp(el, 'font-size', orig.fs);
            restoreProp(el, 'line-height', orig.lh);
        });
        scaled.clear();
    }

    function restoreProp(el, prop, orig) {
        if (orig.value) el.style.setProperty(prop, orig.value, orig.priority);
        else el.style.removeProperty(prop);
    }

    function carriesText(el) {
        if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(el.tagName)) return true;
        for (var n = el.firstChild; n; n = n.nextSibling) {
            if (n.nodeType === 3 && n.nodeValue.trim()) return true;
        }
        return false;
    }

    function applyTextSize() {
        resetScale();
        var factor = state.textsize ? byId.textsize.scale[state.textsize - 1] : 1;
        if (factor === 1 || !document.body) return;

        // Read everything first, then write, so nested sizes never compound.
        var jobs = [];
        document.body.querySelectorAll('*').forEach(function (el) {
            if (SKIP_TAGS.test(el.tagName.toUpperCase()) || el.closest('.a11yw, svg') || !carriesText(el)) return;
            var cs = getComputedStyle(el);
            jobs.push([el, parseFloat(cs.fontSize), cs.lineHeight]);
        });
        jobs.forEach(function (job) {
            var el = job[0];
            scaled.set(el, {
                fs: { value: el.style.getPropertyValue('font-size'), priority: el.style.getPropertyPriority('font-size') },
                lh: { value: el.style.getPropertyValue('line-height'), priority: el.style.getPropertyPriority('line-height') }
            });
            el.style.setProperty('font-size', (job[1] * factor).toFixed(2) + 'px', 'important');
            if (/px$/.test(job[2])) {
                el.style.setProperty('line-height', (parseFloat(job[2]) * factor).toFixed(2) + 'px', 'important');
            }
        });
    }

    // Re-scale content that arrives later (AJAX, sliders, Google Translate).
    var scaleObserver = null, scaleTimer = null;
    function watchTextSize() {
        if (state.textsize && !scaleObserver && window.MutationObserver) {
            scaleObserver = new MutationObserver(function (records) {
                var relevant = records.some(function (r) {
                    return !(r.target.closest && r.target.closest('.a11yw, .a11yw-overlay'));
                });
                if (!relevant) return;
                clearTimeout(scaleTimer);
                scaleTimer = setTimeout(applyTextSize, 400);
            });
            scaleObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
        } else if (!state.textsize && scaleObserver) {
            scaleObserver.disconnect();
            scaleObserver = null;
        }
    }

    function applyAnimations() {
        var paused = state.animations === 1;
        document.querySelectorAll('video').forEach(function (v) {
            if (v.closest('.a11yw')) return;
            if (paused && !v.paused) { v.dataset.a11ywPaused = '1'; v.pause(); }
            else if (!paused && v.dataset.a11ywPaused) { delete v.dataset.a11ywPaused; v.play().catch(function () {}); }
        });
        var $ = window.jQuery;
        if ($ && $.fn && $.fn.slick) {
            $('.slick-initialized').each(function () {
                var $s = $(this);
                try {
                    if (paused) $s.slick('slickPause');
                    else if ($s.slick('slickGetOption', 'autoplay')) $s.slick('slickPlay');
                } catch (e) { /* not a slick instance */ }
            });
        }
    }

    /* Reading guide: a bar or a see-through band that follows the pointer. */
    var guideEls = null, guideY = 0, guideX = 0, guideFrame = 0;

    function applyGuide() {
        if (!state.guide) {
            if (guideEls) {
                guideEls.wrap.remove();
                guideEls = null;
                document.removeEventListener('mousemove', onGuideMove);
                document.removeEventListener('touchmove', onGuideMove);
            }
            return;
        }
        if (!guideEls) {
            var wrap = el('div', { 'class': 'a11yw-overlay', 'aria-hidden': 'true' });
            guideEls = {
                wrap: wrap,
                line: wrap.appendChild(el('div', { 'class': 'a11yw-guide-line' })),
                top: wrap.appendChild(el('div', { 'class': 'a11yw-mask a11yw-mask-top' })),
                bottom: wrap.appendChild(el('div', { 'class': 'a11yw-mask a11yw-mask-bottom' }))
            };
            document.body.appendChild(wrap);
            guideY = window.innerHeight / 2;
            guideX = window.innerWidth / 2;
            document.addEventListener('mousemove', onGuideMove, { passive: true });
            document.addEventListener('touchmove', onGuideMove, { passive: true });
        }
        guideEls.wrap.setAttribute('data-mode', state.guide === 1 ? 'line' : 'mask');
        drawGuide();
    }

    function onGuideMove(e) {
        var p = e.touches ? e.touches[0] : e;
        guideX = p.clientX;
        guideY = p.clientY;
        if (!guideFrame) guideFrame = requestAnimationFrame(drawGuide);
    }

    function drawGuide() {
        guideFrame = 0;
        if (!guideEls) return;
        var band = 60; // half-height of the clear band in mask mode
        guideEls.line.style.transform = 'translate(' + guideX + 'px,' + (guideY + 14) + 'px)';
        guideEls.top.style.height = Math.max(0, guideY - band) + 'px';
        guideEls.bottom.style.top = (guideY + band) + 'px';
    }

    /* Read aloud: speaks the element under the pointer or the focused element. */
    var speechTimer = null, lastSpoken = null, speakingEl = null;
    var SPEAKABLE = 'a[href],button,summary,h1,h2,h3,h4,h5,h6,p,li,dt,dd,td,th,label,figcaption,blockquote,caption,img[alt],input,select,textarea,[role=button],[role=link],[role=heading]';

    function applySpeech() {
        var on = !!state.speech;
        document.removeEventListener('mouseover', onSpeechOver);
        document.removeEventListener('focusin', onSpeechFocus);
        if (on) {
            document.addEventListener('mouseover', onSpeechOver);
            document.addEventListener('focusin', onSpeechFocus);
        } else if (hasSpeech) {
            clearTimeout(speechTimer);
            window.speechSynthesis.cancel();
            setSpeaking(null);
            lastSpoken = null;
        }
    }

    function speechTarget(t) {
        if (!(t instanceof Element) || t.closest('.a11yw')) return null;
        return t.closest(SPEAKABLE);
    }

    function onSpeechOver(e) {
        var target = speechTarget(e.target);
        if (!target || target === lastSpoken) return;
        clearTimeout(speechTimer);
        speechTimer = setTimeout(function () { speak(target); }, 300);
    }

    function onSpeechFocus(e) {
        var target = speechTarget(e.target);
        if (target) { clearTimeout(speechTimer); speak(target); }
    }

    function describe(target) {
        var tag = target.tagName;
        var role = target.getAttribute('role');
        var name = target.getAttribute('aria-label') || '';
        if (!name && tag === 'IMG') name = target.alt;
        if (!name && /^(INPUT|SELECT|TEXTAREA)$/.test(tag)) {
            var lbl = target.labels && target.labels[0];
            name = (lbl ? lbl.innerText : '') || target.placeholder || target.title || '';
            var value = tag === 'SELECT' ? (target.selectedOptions[0] || {}).text : (target.type === 'password' ? '' : target.value);
            if (value) name += ', ' + value;
        }
        if (!name) name = target.innerText || target.textContent || '';
        name = name.replace(/\s+/g, ' ').trim().slice(0, 1200);
        if (!name) return '';

        var prefix = '';
        if (/^H[1-6]$/.test(tag)) prefix = 'Heading level ' + tag[1] + '. ';
        else if (role === 'heading') prefix = 'Heading. ';
        else if (tag === 'A' || role === 'link') prefix = 'Link. ';
        else if (tag === 'BUTTON' || tag === 'SUMMARY' || role === 'button') prefix = 'Button. ';
        else if (tag === 'IMG') prefix = 'Image. ';
        else if (/^(INPUT|SELECT|TEXTAREA)$/.test(tag)) prefix = 'Field. ';
        return prefix + name;
    }

    function speak(target) {
        var text = describe(target);
        if (!text) return;
        lastSpoken = target;
        var synth = window.speechSynthesis;
        synth.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.rate = byId.speech.rate[state.speech - 1] || 1;
        u.lang = root.getAttribute('lang') || 'en';
        u.onend = u.onerror = function () { if (speakingEl === target) setSpeaking(null); };
        setSpeaking(target);
        synth.speak(u);
    }

    function setSpeaking(target) {
        if (speakingEl) speakingEl.classList.remove('a11yw-speaking');
        speakingEl = target;
        if (target) target.classList.add('a11yw-speaking');
    }

    function applyAll() {
        applyClasses();
        applyFilter();
        if (!document.body) return; // the rest runs again on DOMContentLoaded
        applyTextSize();
        watchTextSize();
        applyAnimations();
        applyGuide();
        applySpeech();
    }

    /* ---------- UI ---------- */

    function el(tag, attrs, html) {
        var node = document.createElement(tag);
        if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
        if (html) node.innerHTML = html;
        return node;
    }

    function icon(name) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ICONS[name] + '</svg>';
    }

    var ui = {};

    function build() {
        var widget = el('div', { 'class': 'a11yw', 'data-position': cfg.position });
        if (cfg.color) widget.style.setProperty('--a11yw-accent', cfg.color);
        if (cfg.offsetX >= 0) widget.style.setProperty('--a11yw-offset-x', cfg.offsetX + 'px');
        if (cfg.offsetY >= 0) widget.style.setProperty('--a11yw-offset-y', cfg.offsetY + 'px');

        ui.toggle = el('button', {
            type: 'button',
            'class': 'a11yw-toggle',
            'aria-haspopup': 'dialog',
            'aria-expanded': 'false',
            'aria-controls': 'a11yw-panel',
            'aria-label': 'Accessibility menu'
        }, ICONS.toggle.replace('<svg', '<svg aria-hidden="true" focusable="false"'));

        ui.panel = el('div', {
            id: 'a11yw-panel',
            'class': 'a11yw-panel',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': 'a11yw-title',
            hidden: ''
        });

        var tiles = FEATURES.map(function (f) {
            var steps = f.levels.length > 1
                ? '<span class="a11yw-steps" aria-hidden="true">' + f.levels.map(function () { return '<i></i>'; }).join('') + '</span>'
                : '';
            return '<button type="button" class="a11yw-tile" data-feature="' + f.id + '" aria-pressed="false">' +
                '<span class="a11yw-tile-icon">' + icon(f.id) + '</span>' +
                '<span class="a11yw-tile-label">' + f.label + '</span>' +
                (f.levels.length > 1 ? '<span class="a11yw-tile-state"></span>' : '') +
                steps + '</button>';
        }).join('');

        ui.panel.innerHTML =
            '<div class="a11yw-head">' +
                '<button type="button" class="a11yw-icon-btn a11yw-back" data-action="back" aria-label="Back to settings" hidden>' + ICONS.back + '</button>' +
                '<h2 id="a11yw-title" class="a11yw-title">Accessibility menu</h2>' +
                '<button type="button" class="a11yw-icon-btn" data-action="close" aria-label="Close accessibility menu">' + ICONS.close + '</button>' +
            '</div>' +
            '<div class="a11yw-body">' +
                '<div class="a11yw-view" data-view="main">' +
                    '<div class="a11yw-grid">' + tiles + '</div>' +
                    (cfg.hide.indexOf('structure') === -1
                        ? '<button type="button" class="a11yw-wide" data-action="structure">' + icon('structure') + '<span>Page structure</span></button>'
                        : '') +
                '</div>' +
                '<div class="a11yw-view" data-view="structure" hidden>' +
                    '<h3 class="a11yw-subtitle">Headings</h3><ul class="a11yw-list" data-list="headings"></ul>' +
                    '<h3 class="a11yw-subtitle">Landmarks</h3><ul class="a11yw-list" data-list="landmarks"></ul>' +
                '</div>' +
            '</div>' +
            '<div class="a11yw-foot">' +
                '<button type="button" class="a11yw-wide a11yw-reset" data-action="reset">' + icon('reset') + '<span>Reset all settings</span></button>' +
            '</div>';
        ui.panel.querySelectorAll('.a11yw-icon-btn svg').forEach(function (s) {
            s.setAttribute('aria-hidden', 'true');
            s.setAttribute('focusable', 'false');
        });

        ui.live = el('div', { 'class': 'a11yw-sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });

        widget.appendChild(ui.toggle);
        widget.appendChild(ui.panel);
        widget.appendChild(ui.live);
        document.body.appendChild(widget);
        ui.widget = widget;

        ui.toggle.addEventListener('click', function () { isOpen() ? close() : open(); });
        ui.panel.addEventListener('click', onPanelClick);
        ui.panel.addEventListener('keydown', onPanelKeydown);
        document.addEventListener('mousedown', function (e) {
            if (isOpen() && !widget.contains(e.target)) close(false);
        });

        renderTiles();
    }

    function renderTiles() {
        ui.panel.querySelectorAll('.a11yw-tile').forEach(function (tile) {
            var f = byId[tile.getAttribute('data-feature')];
            var level = state[f.id];
            tile.setAttribute('aria-pressed', level ? 'true' : 'false');
            var st = tile.querySelector('.a11yw-tile-state');
            if (st) st.textContent = level ? f.levels[level - 1] : '';
            tile.querySelectorAll('.a11yw-steps i').forEach(function (dot, i) {
                dot.classList.toggle('is-on', i < level);
            });
        });
    }

    function announce(msg) {
        ui.live.textContent = '';
        setTimeout(function () { ui.live.textContent = msg; }, 50);
    }

    function cycle(id) {
        var f = byId[id];
        state[id] = (state[id] + 1) % (f.levels.length + 1);
        save();
        applyAll();
        renderTiles();
        if (f.levels.length > 1) {
            announce(f.label + ': ' + (state[id] ? f.levels[state[id] - 1] : 'off'));
        }
    }

    function resetAll() {
        FEATURES.forEach(function (f) { state[f.id] = 0; });
        save();
        applyAll();
        renderTiles();
        announce('All accessibility settings have been reset');
    }

    function onPanelClick(e) {
        var btn = e.target.closest('button');
        if (!btn) return;
        var feature = btn.getAttribute('data-feature');
        if (feature) return cycle(feature);
        switch (btn.getAttribute('data-action')) {
            case 'close': return close();
            case 'reset': return resetAll();
            case 'structure': return showView('structure');
            case 'back': return showView('main');
        }
    }

    function isOpen() { return !ui.panel.hidden; }

    function open() {
        ui.panel.hidden = false;
        ui.toggle.setAttribute('aria-expanded', 'true');
        showView('main');
    }

    function close(returnFocus) {
        ui.panel.hidden = true;
        ui.toggle.setAttribute('aria-expanded', 'false');
        if (returnFocus !== false) ui.toggle.focus();
    }

    function showView(name) {
        ui.panel.querySelectorAll('.a11yw-view').forEach(function (v) {
            v.hidden = v.getAttribute('data-view') !== name;
        });
        var back = ui.panel.querySelector('.a11yw-back');
        back.hidden = name === 'main';
        ui.panel.querySelector('.a11yw-title').textContent = name === 'main' ? 'Accessibility menu' : 'Page structure';
        if (name === 'structure') {
            buildStructure();
            back.focus();
        } else {
            var first = ui.panel.querySelector('.a11yw-tile');
            if (first) first.focus();
        }
    }

    function focusables() {
        return Array.prototype.filter.call(
            ui.panel.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])'),
            function (n) { return !n.disabled && n.getClientRects().length > 0; }
        );
    }

    function onPanelKeydown(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            close();
        } else if (e.key === 'Tab') {
            var items = focusables();
            if (!items.length) return;
            var first = items[0], last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    }

    /* Page structure: list of headings and landmarks. Choosing one jumps to it. */
    var LANDMARKS = [
        ['header, [role=banner]', 'Banner'],
        ['nav, [role=navigation]', 'Navigation'],
        ['main, [role=main]', 'Main content'],
        ['aside, [role=complementary]', 'Complementary'],
        ['[role=search]', 'Search'],
        ['form[aria-label], form[aria-labelledby], [role=form]', 'Form'],
        ['footer, [role=contentinfo]', 'Footer']
    ];

    function visible(n) {
        return !n.closest('.a11yw, [hidden], [aria-hidden=true]') && n.getClientRects().length > 0;
    }

    function accessibleLabel(n) {
        var id = n.getAttribute('aria-labelledby');
        var ref = id && document.getElementById(id.split(' ')[0]);
        return (n.getAttribute('aria-label') || (ref && ref.textContent) || '').trim();
    }

    function buildStructure() {
        var headings = ui.panel.querySelector('[data-list=headings]');
        var landmarks = ui.panel.querySelector('[data-list=landmarks]');
        headings.innerHTML = '';
        landmarks.innerHTML = '';

        document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(function (h) {
            var text = (h.innerText || h.textContent || '').replace(/\s+/g, ' ').trim();
            if (!text || !visible(h)) return;
            var level = +h.tagName[1];
            headings.appendChild(structureItem(h, 'H' + level, text, level));
        });

        var seen = new Set();
        LANDMARKS.forEach(function (lm) {
            document.querySelectorAll(lm[0]).forEach(function (n) {
                if (seen.has(n) || !visible(n)) return;
                // header/footer are only landmarks when not nested in article/section etc.
                if (/^(HEADER|FOOTER)$/.test(n.tagName) && !n.getAttribute('role') &&
                    n.parentElement.closest('article, aside, main, nav, section')) return;
                seen.add(n);
                var label = accessibleLabel(n);
                landmarks.appendChild(structureItem(n, lm[1], label || lm[1], 1));
            });
        });

        if (!headings.children.length) headings.innerHTML = '<li class="a11yw-empty">No headings found</li>';
        if (!landmarks.children.length) landmarks.innerHTML = '<li class="a11yw-empty">No landmarks found</li>';
    }

    function structureItem(target, tag, text, level) {
        var li = el('li');
        li.style.setProperty('--a11yw-indent', (level - 1) * 12 + 'px');
        var btn = el('button', { type: 'button', 'class': 'a11yw-struct' });
        btn.innerHTML = '<span class="a11yw-struct-tag"></span><span class="a11yw-struct-text"></span>';
        btn.firstChild.textContent = tag;
        btn.lastChild.textContent = text;
        btn.addEventListener('click', function () {
            close(false);
            if (!target.matches('a[href], button, input, select, textarea, [tabindex]')) {
                target.setAttribute('tabindex', '-1');
            }
            target.scrollIntoView({ block: 'start' });
            target.focus({ preventScroll: true });
        });
        li.appendChild(btn);
        return li;
    }

    /* ---------- boot ---------- */

    // Classes and filters can go on <html> straight away, which avoids a flash
    // of unstyled content for returning visitors.
    applyClasses();
    applyFilter();

    function init() {
        build();
        applyAll();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    window.A11yWidget = {
        open: function () { open(); },
        close: function () { close(); },
        reset: resetAll,
        getState: function () { return JSON.parse(JSON.stringify(state)); }
    };
})();
