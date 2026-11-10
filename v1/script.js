// Intro video: custom play button, native controls once playing.
const intro = document.getElementById('intro');
const introPlay = document.getElementById('introPlay');
if (intro && introPlay) {
  introPlay.addEventListener('click', () => {
    intro.parentElement.classList.add('playing');
    intro.controls = true;
    intro.currentTime = 0;
    intro.play();
  });
}

// Portfolio lightbox: the Drive player is only loaded when a clip is opened.
const lightbox = document.getElementById('lightbox');
const frame = document.getElementById('lightboxFrame');
const title = document.getElementById('lightboxTitle');

document.querySelectorAll('.clip').forEach((clip) => {
  clip.setAttribute('aria-label', 'Play ' + clip.dataset.title);
  clip.addEventListener('click', () => {
    if (intro) intro.pause();
    title.textContent = clip.dataset.title;
    const player = document.createElement('iframe');
    player.src = 'https://drive.google.com/file/d/' + clip.dataset.id + '/preview';
    player.allow = 'autoplay; fullscreen';
    player.allowFullscreen = true;
    player.title = clip.dataset.title;
    frame.replaceChildren(player);
    lightbox.showModal();
  });
});

document.getElementById('lightboxClose').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.close(); });
lightbox.addEventListener('close', () => frame.replaceChildren());

// Mobile sticky CTA: show after the hero, hide while the pricing card is on screen.
const sticky = document.getElementById('stickyCta');
const hero = document.querySelector('.hero');
const enroll = document.getElementById('enroll');
let pastHero = false;
let atEnroll = false;
const syncSticky = () => sticky.classList.toggle('is-on', pastHero && !atEnroll);
new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; syncSticky(); }).observe(hero);
new IntersectionObserver(([e]) => { atEnroll = e.isIntersecting; syncSticky(); }, { threshold: 0.2 }).observe(enroll);

// Scroll reveal.
const targets = document.querySelectorAll('.head, .why, .earn, .rules, .proof dl, .clip, .steps li, .parts, .tasks, .coach > *, .fit__col, .ticket, .faq, .viewfinder');
const reveal = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); reveal.unobserve(e.target); }
  });
}, { rootMargin: '0px 0px -8% 0px' });
targets.forEach((t) => { t.classList.add('rv'); reveal.observe(t); });
