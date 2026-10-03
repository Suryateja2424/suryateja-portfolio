/**
 * Rayhan Aditya Portfolio — High-Performance Scroll-Driven Video Engine
 */

(function () {
  'use strict';

  // --- Configuration ---
  const TOTAL_FRAMES = 192;
  const DAMPING = 0.085; // Momentum damping for silky-smooth physics scrubbing
  const FRAME_PATH = (index) => `frames/frame_${index.toString().padStart(6, '0')}.jpg`;

  // --- Video Projects Configuration ---
  const videoProjectsConfig = {
    "harley-davidson": {
      title: "HARLEY-DAVIDSON",
      videoUrl: "PASTE_HOSTED_VIDEO_URL_HERE"
    },
    "personal-video": {
      title: "PERSONAL VIDEO",
      videoUrl: "PASTE_HOSTED_VIDEO_URL_HERE"
    },
    "interior-design": {
      title: "INTERIOR DESIGN",
      videoUrl: "PASTE_HOSTED_VIDEO_URL_HERE"
    }
  };

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
        const projectId = card.getAttribute('data-project-id');
        const project = videoProjectsConfig[projectId];
        
        if (project) {
          const hasExternalUrl = project.videoUrl && project.videoUrl !== "PASTE_HOSTED_VIDEO_URL_HERE" && project.videoUrl !== "";
          
          // Reset modal state
          const existingError = videoModal.querySelector('.video-error-message');
          if (existingError) existingError.remove();
          modalVideoPlayer.style.display = 'block';
          videoModal.classList.add('active');

          const showError = () => {
            modalVideoPlayer.style.display = 'none';
            const errorMsg = document.createElement('div');
            errorMsg.className = 'video-error-message';
            errorMsg.style.color = '#fff';
            errorMsg.style.fontFamily = "'Plus Jakarta Sans', sans-serif";
            errorMsg.style.textAlign = 'center';
            errorMsg.style.position = 'absolute';
            errorMsg.style.top = '50%';
            errorMsg.style.left = '50%';
            errorMsg.style.transform = 'translate(-50%, -50%)';
            errorMsg.style.width = '100%';
            errorMsg.style.padding = '0 20px';
            errorMsg.innerHTML = `
              <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem; font-family: 'Bebas Neue', sans-serif; letter-spacing: 1px;">VIDEO UNAVAILABLE</h3>
              <p style="color: #aaa; margin-bottom: 0.5rem;">The video for <strong>${project.title}</strong> could not be loaded.</p>
              <p style="color: #666; font-size: 0.9rem;">Please update the <code>videoUrl</code> property in main.js with a valid hosted video link.</p>
            `;
            document.querySelector('.video-modal-content').appendChild(errorMsg);
          };

          if (hasExternalUrl) {
            modalVideoPlayer.src = project.videoUrl;
            modalVideoPlayer.onerror = showError;
            
            const playPromise = modalVideoPlayer.play();
            if (playPromise !== undefined) {
              playPromise.catch(e => {
                console.warn("Video auto-play prevented or failed:", e);
              });
            }
          } else {
            // URL not provided yet, show error message immediately without trying to load
            showError();
          }
        }
      });
    });

    const closeModal = () => {
      videoModal.classList.remove('active');
      modalVideoPlayer.pause();
      modalVideoPlayer.src = ''; // reset to stop buffering
      
      const existingError = videoModal.querySelector('.video-error-message');
      if (existingError) existingError.remove();
    };

    closeVideoModalBtn.addEventListener('click', closeModal);
    videoModal.addEventListener('click', (e) => {
      if (e.target === videoModal) {
        closeModal();
      }
    });
  }

})();
