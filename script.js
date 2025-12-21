const container = document.getElementById('brush-container');
const master = document.getElementById('master-site');
const albumScroll = document.getElementById('album-scroll');
const portfolioPage = document.getElementById('portfolio-page');
const transitionLayer = document.getElementById('asdf-transition-layer');

let lastPos = window.pageYOffset;
let isAlbumOpen = false;
let lastLeft = 0;

// --- HERO MOSH STAMPING ---
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

// --- PORTFOLIO TOGGLE ---
function togglePortfolio(open) {
    isAlbumOpen = open;
    portfolioPage.classList.toggle('active', open);
    // Control whether the background scrolls when gallery is open
    document.body.style.overflow = open ? 'hidden' : 'auto';
    
    // Smooth transition handling
    if (open) {
        portfolioPage.style.display = 'flex';
        setTimeout(() => portfolioPage.style.opacity = '1', 10);
    } else {
        portfolioPage.style.opacity = '0';
        setTimeout(() => portfolioPage.style.display = 'none', 500);
    }
}

// --- ASDF GLITCH TRAILS (Gallery) ---
function triggerAsdf() {
    if (!isAlbumOpen) return;
    const photos = document.querySelectorAll('.album-photo');
    photos.forEach((photo, i) => {
        const img = photo.querySelector('img');
        const rect = img.getBoundingClientRect();
        
        // Only trigger for images visible on screen
        if (rect.right > 0 && rect.left < window.innerWidth) {
            const stamp = document.createElement('div');
            stamp.className = 'asdf-stamp';
            stamp.style.width = rect.width + 'px';
            stamp.style.height = rect.height + 'px';
            stamp.style.left = rect.left + 'px';
            stamp.style.top = rect.top + 'px';

            const clone = img.cloneNode();
            stamp.appendChild(clone);
            transitionLayer.appendChild(stamp);

            stamp.animate([
                { opacity: 1, transform: 'scaleX(1) translateX(0px)' },
                { opacity: 0, transform: 'scaleX(2.5) translateX(150px)' }
            ], { duration: 600, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' }).onfinish = () => stamp.remove();
        }
    });
}

// --- GLOBAL SCROLL LISTENER (Homepage) ---
window.addEventListener('scroll', () => {
    const currentPos = window.pageYOffset;
    
    // 1. Trigger Mosh Stamp
    if (Math.abs(currentPos - lastPos) > 15) {
        createMoshStamp(currentPos);
        lastPos = currentPos;
    }
    
    // 2. Toggle 'scrolled' class for the Scroll Hint
    if (window.scrollY > 80) {
        document.body.classList.add('scrolled');
    } else {
        document.body.classList.remove('scrolled');
    }
}, { passive: true });

// --- PORTFOLIO HORIZONTAL SCROLL ---
albumScroll.addEventListener('scroll', () => {
    const currentLeft = albumScroll.scrollLeft;
    if (Math.abs(currentLeft - lastLeft) > 20) {
        triggerAsdf();
        lastLeft = currentLeft;
    }
}, { passive: true });

// --- MOUSE WHEEL TO HORIZONTAL ---
albumScroll.addEventListener('wheel', (e) => { 
    if (isAlbumOpen) {
        e.preventDefault(); 
        albumScroll.scrollLeft += e.deltaY; 
    }
}, { passive: false });
