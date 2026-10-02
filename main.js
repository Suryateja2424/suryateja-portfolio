/**
 * Rayhan Aditya Portfolio — High-Performance Scroll-Driven Video Engine
 */

(function () {
  'use strict';

  // --- Configuration ---
  const TOTAL_FRAMES = 192;
  const DAMPING = 0.085; // Momentum damping for silky-smooth physics scrubbing
  const FRAME_PATH = (index) => `frames/frame_${index.toString().padStart(6, '0')}.jpg`;

  // --- DOM Elements ---
  const canvas = document.getElementById('animation-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const loader = document.getElementById('loader');
  const loaderProgressBar = document.getElementById('loader-progress-bar');
  const loaderPercent = document.getElementById('loader-percent');

  // --- State Variables ---
  const images = new Array(TOTAL_FRAMES);
  const loadedStatus = new Array(TOTAL_FRAMES).fill(false);
  let loadedCount = 0;
  let currentFrame = 0;
  let targetFrame = 0;
  let lastDrawnFrame = -1;
  let isLoaderHidden = false;
  let animationFrameId = null;

  // --- Resize & HiDPI Canvas Scaling ---
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    if (lastDrawnFrame >= 0) {
      drawFrame(lastDrawnFrame);
    }
  }

  window.addEventListener('resize', resizeCanvas, { passive: true });

  // --- Draw Cover (Centered to align with giant PORTFOLIO background) ---
  function drawCover(img) {
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    // Use adaptive scaling to prevent over-cropping on mobile
    const isMobile = cw < 768;
    const scale = isMobile ? Math.max(cw / iw, (ch / ih) * 0.8) : Math.max(cw / iw, ch / ih);
    const renderW = iw * scale;
    const renderH = ih * scale;

    const offsetX = (cw - renderW) / 2;
    // Align closer to top so character face isn't heavily cropped on mobile
    const offsetY = isMobile ? (ch - renderH) * 0.2 : (ch - renderH) / 2;

    ctx.fillStyle = '#060608';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
  }

  // --- Nearest Loaded Frame Fallback (Zero Flicker) ---
  function getBestAvailableFrame(frameIndex) {
    if (loadedStatus[frameIndex]) {
      return frameIndex;
    }

    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      const prev = frameIndex - offset;
      if (prev >= 0 && loadedStatus[prev]) return prev;

      const next = frameIndex + offset;
      if (next < TOTAL_FRAMES && loadedStatus[next]) return next;
    }

    return 0;
  }

  // --- Render Frame ---
  function drawFrame(index) {
    const bestIndex = getBestAvailableFrame(index);
    const img = images[bestIndex];
    if (img && img.complete) {
      drawCover(img);
      lastDrawnFrame = bestIndex;
    }
  }

  // --- Scroll Progress to Target Frame ---
  function updateScrollTarget() {
    const scrollY = window.scrollY || window.pageYOffset;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.min(Math.max(scrollY / maxScroll, 0), 1);

    targetFrame = progress * (TOTAL_FRAMES - 1);
  }

  // --- Smooth Physics Scrubbing RAF Loop ---
  function tick() {
    const diff = targetFrame - currentFrame;
    if (Math.abs(diff) > 0.001) {
      currentFrame += diff * DAMPING;
    } else {
      currentFrame = targetFrame;
    }

    const frameToRender = Math.round(currentFrame);

    if (frameToRender !== lastDrawnFrame) {
      drawFrame(frameToRender);
    }

    animationFrameId = requestAnimationFrame(tick);
  }

  // --- Progressive Frame Preloading ---
  function onFrameLoaded(index) {
    loadedStatus[index] = true;
    loadedCount++;

    const progress = (loadedCount / TOTAL_FRAMES) * 100;
    if (loaderProgressBar) {
      loaderProgressBar.style.width = `${progress.toFixed(0)}%`;
    }
    if (loaderPercent) {
      loaderPercent.textContent = `${progress.toFixed(0)}%`;
    }

    // Render first frame immediately
    if (index === 0 && lastDrawnFrame === -1) {
      drawFrame(0);
    }

    // Hide loader once minimum initial buffer (16 frames) or all frames ready
    if (!isLoaderHidden && (loadedCount >= Math.min(16, TOTAL_FRAMES) || loadedCount === TOTAL_FRAMES)) {
      isLoaderHidden = true;
      loader.classList.add('loaded');
      setTimeout(() => {
        if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
      }, 700);
    }
  }

  function preloadFrames() {
    // 1. Frame 0 priority
    const firstImg = new Image();
    firstImg.src = FRAME_PATH(0);
    images[0] = firstImg;
    firstImg.onload = () => onFrameLoaded(0);
    firstImg.onerror = () => onFrameLoaded(0);

    // 2. Remaining frames
    for (let i = 1; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = FRAME_PATH(i);
      images[i] = img;
      img.onload = () => onFrameLoaded(i);
      img.onerror = () => onFrameLoaded(i);
    }
  }

  // --- Initialization ---
  function init() {
    resizeCanvas();
    preloadFrames();

    window.addEventListener('scroll', updateScrollTarget, { passive: true });
    updateScrollTarget();

    // Start RAF loop
    animationFrameId = requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // --- Video Modal Logic ---
  const videoModal = document.getElementById('video-modal');
  const modalVideoPlayer = document.getElementById('modal-video-player');
  const closeVideoModalBtn = document.getElementById('close-video-modal');
  const videoCards = document.querySelectorAll('.video-card');

  if (videoModal && modalVideoPlayer && closeVideoModalBtn) {
    videoCards.forEach(card => {
      card.addEventListener('click', () => {
        const videoSrc = card.getAttribute('data-video-src');
        if (videoSrc) {
          modalVideoPlayer.src = videoSrc;
          videoModal.classList.add('active');
          modalVideoPlayer.play().catch(e => console.error("Video play failed:", e));
        }
      });
    });

    const closeModal = () => {
      videoModal.classList.remove('active');
      modalVideoPlayer.pause();
      modalVideoPlayer.src = ''; // reset to stop buffering
    };

    closeVideoModalBtn.addEventListener('click', closeModal);
    videoModal.addEventListener('click', (e) => {
      if (e.target === videoModal) {
        closeModal();
      }
    });
  }

})();
