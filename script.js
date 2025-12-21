const container = document.getElementById('brush-container');
const master = document.getElementById('master-site');
let lastPos = window.pageYOffset;
let isAlbumOpen = false;

function createMoshStamp(yPos) {
if (isAlbumOpen) return;
const stamp = document.createElement('div');
stamp.className = 'brush-stamp';
stamp.appendChild(master.cloneNode(true));
stamp.style.top = `-${yPos}px`;
container.appendChild(stamp);
const animation = stamp.animate([
{ opacity: 0.7, transform: 'translateY(0px) scale(1)' },
{ opacity: 0, transform: 'translateY(25px) scale(1.01)' }
], { duration: 1000, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' });
animation.onfinish = () => stamp.remove();
}

window.addEventListener('scroll', () => {
const currentPos = window.pageYOffset;
if (Math.abs(currentPos - lastPos) > 12) {
createMoshStamp(currentPos);
lastPos = currentPos;
}
});

function togglePortfolio(open) {
isAlbumOpen = open;
document.getElementById('portfolio-page').classList.toggle('active', open);
document.body.style.overflow = open ? 'hidden' : 'auto';
}

const albumScroll = document.getElementById('album-scroll');
const transitionLayer = document.getElementById('asdf-transition-layer');
let lastLeft = 0;

function triggerAsdf() {
if (!isAlbumOpen) return;
const photos = document.querySelectorAll('.album-photo');
photos.forEach((photo, i) => {
const img = photo.querySelector('img');
const rect = img.getBoundingClientRect();
if (rect.right > 0 && rect.left < window.innerWidth) {
const stamp = document.createElement('div');
stamp.className = 'asdf-stamp';
stamp.style.width = rect.width + 'px';
stamp.style.height = rect.height + 'px';
stamp.style.left = rect.left + 'px';
stamp.style.top = rect.top + 'px';

let lClip = (i === 0) ? "0px" : "-1000px";
let rClip = (i === photos.length - 1) ? "0px" : "-1000px";
stamp.style.clipPath = `inset(0px ${rClip} 0px ${lClip})`;

const clone = img.cloneNode();
stamp.appendChild(clone);
transitionLayer.appendChild(stamp);

stamp.animate([
{ opacity: 1, transform: 'scaleX(1) translateX(0px)' },
{ opacity: 0, transform: 'scaleX(2.8) translateX(180px)' }
], { duration: 500, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', fill: 'forwards' }).onfinish = () => stamp.remove();
}
});
}

albumScroll.addEventListener('scroll', () => {
if (Math.abs(albumScroll.scrollLeft - lastLeft) > 15) {
triggerAsdf();
lastLeft = albumScroll.scrollLeft;
}
});

albumScroll.addEventListener('wheel', (e) => { e.preventDefault(); albumScroll.scrollLeft += e.deltaY; });
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        document.body.classList.add('scrolled');
    } else {
        document.body.classList.remove('scrolled');
    }
});
const scrollContainer = document.querySelector('.horizontal-scroll');
const displacementMap = document.querySelector('#asdf-sideways-filter feDisplacementMap');
let lastScrollLeft = 0;

if (scrollContainer && displacementMap) {
    scrollContainer.addEventListener('scroll', () => {
        const currentScrollLeft = scrollContainer.scrollLeft;

        if (currentScrollLeft > lastScrollLeft) {
            // SCROLLING RIGHT: Trail should stretch Right (Negative Scale)
            displacementMap.setAttribute('scale', '-200');
        } else {
            // SCROLLING LEFT: Trail should stretch Left (Positive Scale)
            displacementMap.setAttribute('scale', '200');
        }
        lastScrollLeft = currentScrollLeft;
    });
}

