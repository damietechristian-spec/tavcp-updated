const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- theme toggle (light / dark) ---------- */
document.getElementById('themeToggle').addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('tavcp-theme', next); } catch (e) { /* storage blocked: choice lasts for this visit */ }
});

/* ---------- intro: the logo shrinks and drifts as the page slides over it ---------- */
const intro = document.querySelector('.intro');
const stage = document.getElementById('introStage');
let ticking = false;
function introFrame() {
  ticking = false;
  const h = intro.offsetHeight;
  const p = Math.min(Math.max(scrollY / h, 0), 1);
  stage.style.transform = 'translateY(' + (scrollY * 0.5) + 'px) scale(' + (1 - p * 0.45) + ')';
  stage.style.opacity = String(1 - p * 1.15);
}
if (!reduceMotion) {
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(introFrame); } }, { passive: true });
  introFrame();
}

/* ---------- marquee: duplicate the list so the loop is seamless ---------- */
const marquee = document.getElementById('marquee');
marquee.append(...[...marquee.children].map((li) => { const c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); return c; }));

/* ---------- nav: highlight the section in view ---------- */
const navLinks = [...document.querySelectorAll('.nav__links a')];
const spy = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
navLinks.forEach((a) => { const s = document.querySelector(a.getAttribute('href')); if (s) spy.observe(s); });

/* ---------- lightbox: players load only when a card is opened ---------- */
const lightbox = document.getElementById('lightbox');
const frame = document.getElementById('lightboxFrame');
const title = document.getElementById('lightboxTitle');
document.querySelectorAll('.clip').forEach((clip) => {
  clip.setAttribute('aria-label', 'Play ' + clip.dataset.title);
  clip.addEventListener('click', () => {
    title.textContent = clip.dataset.title;
    let player;
    if (clip.dataset.src) {
      player = document.createElement('video');
      player.src = clip.dataset.src;
      player.controls = true;
      player.autoplay = true;
      player.playsInline = true;
    } else {
      player = document.createElement('iframe');
      player.src = 'https://drive.google.com/file/d/' + clip.dataset.id + '/preview';
      player.allow = 'autoplay; fullscreen';
      player.allowFullscreen = true;
      player.title = clip.dataset.title;
    }
    frame.replaceChildren(player);
    lightbox.showModal();
  });
});
document.getElementById('lightboxClose').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.close(); });
lightbox.addEventListener('close', () => frame.replaceChildren());

/* ---------- halftone canvases ---------- */
const LIME = '#c6f135';
const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
const fields = {
  // two soft glows left and right, dark in the middle behind the text
  glow(x, y, w, h) {
    const blob = (cx) => clamp01(1 - Math.hypot((x - cx) / (w * 0.2), (y - h * 0.5) / (h * 0.75)));
    const grain = 0.5 + 0.5 * Math.sin(x * 0.011 + y * 0.017);
    return Math.max(blob(w * 0.16), blob(w * 0.84)) * (0.75 + 0.25 * grain) + 0.035;
  },
  // rolling hills rising to the right
  hills(x, y, w, h) {
    const nx = x / w;
    const ridge = 0.42 + 0.16 * Math.sin(nx * 7 + 1) + 0.1 * Math.sin(nx * 15 + 2.3) + 0.05 * Math.sin(nx * 31);
    const under = (y / h - (1 - ridge - nx * 0.25)) * 1.6;
    const bands = 0.5 + 0.5 * Math.sin(nx * 22 + (y / h) * 9);
    return clamp01(under) * (0.45 + 0.55 * bands) * (0.55 + nx * 0.6) + 0.04;
  },
  // a glowing ring
  ring(x, y, w, h) {
    const r = Math.min(w, h) * 0.34;
    const d = Math.hypot(x - w / 2, y - h / 2);
    const band = Math.exp(-Math.pow((d - r) / (r * 0.24), 2));
    return band * (0.7 + 0.3 * Math.sin(Math.atan2(y - h / 2, x - w / 2) * 3 + 1));
  },
};
function drawHalftone(canvas) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#0b0b0a';
  ctx.fillRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = LIME;
  const field = fields[canvas.dataset.halftone] || fields.glow;
  const step = rect.width < 500 ? 6 : 9;
  let row = 0;
  for (let y = step / 2; y < rect.height; y += step * 0.866, row++) {
    for (let x = (row % 2 ? step : step / 2); x < rect.width; x += step) {
      const r = clamp01(field(x, y, rect.width, rect.height)) * step * 0.6;
      if (r < 0.35) continue;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.2832);
      ctx.fill();
    }
  }
}
const canvases = [...document.querySelectorAll('canvas[data-halftone]')];
const drawAll = () => canvases.forEach(drawHalftone);
drawAll();
let resizeTimer;
addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(drawAll, 150); });
addEventListener('load', drawAll);

/* ---------- mobile sticky CTA: after the hero, hidden over the offer ---------- */
const sticky = document.getElementById('stickyCta');
let pastHero = false;
let atOffer = false;
const syncSticky = () => sticky.classList.toggle('is-on', pastHero && !atOffer);
new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting && e.boundingClientRect.top < 0; syncSticky(); }).observe(document.querySelector('.hero'));
new IntersectionObserver(([e]) => { atOffer = e.isIntersecting; syncSticky(); }, { threshold: 0.15 }).observe(document.getElementById('register'));

/* ---------- scroll reveal ---------- */
const targets = document.querySelectorAll('.hero .wrap > *, .tl__row, .banner p, .side, .rows, .caps, .center, .grid4 li, .grid3 li, .earn, .mosaic > div, .why li, .fit__col, .disclaimer, .offer');
const reveal = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); reveal.unobserve(e.target); } });
}, { rootMargin: '0px 0px -6% 0px' });
targets.forEach((t) => { t.classList.add('rv'); reveal.observe(t); });
