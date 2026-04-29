const container = document.getElementById('brush-container');
const master = document.getElementById('master-site');
const albumScroll = document.getElementById('album-scroll');
const transitionLayer = document.getElementById('asdf-transition-layer');
const portfolioPage = document.getElementById('portfolio-page');

let lastScrollY = window.pageYOffset;
let lastScrollX = 0;
let isAlbumOpen = false;
let scrollTicking = false;
let albumTicking = false;

function createMoshStamp(yPos) {
  if (isAlbumOpen) return;
  const stamp = document.createElement('div');
  stamp.className = 'brush-stamp';
  stamp.appendChild(master.cloneNode(true));
  stamp.style.top = `-${yPos}px`;
  container.appendChild(stamp);

  stamp.animate([
    { opacity: 0.7, transform: 'translateY(0px) scale(1)' },
    { opacity: 0,   transform: 'translateY(25px) scale(1.01)' }
  ], {
    duration: 1000,
    easing: 'cubic-bezier(0.25, 1, 0.5, 1)'
  }).onfinish = () => stamp.remove();
}

function triggerAsdf() {
  if (!isAlbumOpen) return;
  const photos = document.querySelectorAll('.album-photo');
  const vw = window.innerWidth;

  // READ phase — batch all getBoundingClientRect calls before any DOM writes
  const visible = [];
  photos.forEach((photo, i) => {
    const img = photo.querySelector('img');
    const rect = img.getBoundingClientRect();
    if (rect.right > 0 && rect.left < vw) {
      visible.push({ img, rect, i, total: photos.length });
    }
  });

  // WRITE phase — no more layout reads after this point
  visible.forEach(({ img, rect, i, total }) => {
    const stamp = document.createElement('div');
    stamp.className = 'asdf-stamp';

    const lClip = i === 0         ? '0px' : '-1000px';
    const rClip = i === total - 1 ? '0px' : '-1000px';

    Object.assign(stamp.style, {
      width:    `${rect.width}px`,
      height:   `${rect.height}px`,
      left:     `${rect.left}px`,
      top:      `${rect.top}px`,
      clipPath: `inset(0px ${rClip} 0px ${lClip})`
    });

    stamp.appendChild(img.cloneNode());
    transitionLayer.appendChild(stamp);

    stamp.animate([
      { opacity: 1, transform: 'scaleX(1) translateX(0px)' },
      { opacity: 0, transform: 'scaleX(2.8) translateX(180px)' }
    ], {
      duration: 500,
      easing: 'cubic-bezier(0.33, 1, 0.68, 1)',
      fill: 'forwards'
    }).onfinish = () => stamp.remove();
  });
}

// Window scroll — mosh stamp + scrolled class, one rAF per frame
window.addEventListener('scroll', () => {
  if (scrollTicking) return;
  scrollTicking = true;

  requestAnimationFrame(() => {
    const currentY = window.pageYOffset;

    if (Math.abs(currentY - lastScrollY) > 12) {
      createMoshStamp(currentY);
      lastScrollY = currentY;
    }

    document.body.classList.toggle('scrolled', currentY > 50);

    scrollTicking = false;
  });
}, { passive: true });

// Album horizontal scroll
albumScroll.addEventListener('scroll', () => {
  if (albumTicking) return;
  albumTicking = true;

  requestAnimationFrame(() => {
    if (Math.abs(albumScroll.scrollLeft - lastScrollX) > 15) {
      triggerAsdf();
      lastScrollX = albumScroll.scrollLeft;
    }
    albumTicking = false;
  });
}, { passive: true });

// Wheel → horizontal scroll (preventDefault needs active listener)
albumScroll.addEventListener('wheel', (e) => {
  e.preventDefault();
  albumScroll.scrollLeft += e.deltaY;
}, { passive: false });

// Portfolio toggle
function togglePortfolio(open) {
  isAlbumOpen = open;
  portfolioPage.classList.toggle('active', open);
  document.body.style.overflow = open ? 'hidden' : 'auto';
}
