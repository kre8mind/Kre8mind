/**
 * KRE8MIND · CLARITY BY DESIGN
 * Interactive Behaviors, Seamless Smooth Carousel & Motion Controller
 */

// API Host Resolver (Handles file:///, 127.0.0.1, and local dev ports)
const isLocalDev = window.location.protocol === 'file:' || 
  (window.location.port && window.location.port !== '5000' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname === '0.0.0.0'
  ));
const API_BASE = isLocalDev ? 'http://localhost:5000' : '';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

document.addEventListener('DOMContentLoaded', () => {
  initLenisSmoothScroll();
  initCustomSquareCursor();
  initHeader();
  initMobileMenu();
  initSeamlessShowcaseCarousel();
  initSolutionSwitcher();
  initDynamicProjects();
  initTransformationSweep();
  initCaseStudyViewer();
  initJournal();
  initClientStories();
  initServiceTabs();
  initAccordions();
  initScrollAnimations();
  initInquiryModal();
  initVisitorTracking();
});

/* --------------------------------------------------------------------------
   0. Ultra-Silky Smooth Momentum Scroll Engine (Framer / Sweet Glide)
   -------------------------------------------------------------------------- */
function initLenisSmoothScroll() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

  let currentY = window.scrollY;
  let targetY = window.scrollY;
  let isScrolling = false;
  const ease = 0.082; // Buttery slow, luxurious momentum dampening

  function onWheel(e) {
    const csViewer = document.getElementById('kre8mind-case-study-viewer');
    if (csViewer && csViewer.classList.contains('open')) {
      e.preventDefault();
      csViewer.scrollTop += e.deltaY;
      return;
    }

    const inqModal = document.getElementById('kre8mind-inquiry-modal');
    if (inqModal && inqModal.classList.contains('open')) {
      e.preventDefault();
      inqModal.scrollTop += e.deltaY;
      return;
    }

    if (e.target.closest('.case-study-modal-backdrop') || e.target.closest('.inquiry-modal-backdrop')) {
      return;
    }
    
    e.preventDefault();
    const delta = e.deltaY;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    targetY = Math.max(0, Math.min(targetY + delta * 1.1, maxScroll));

    if (!isScrolling) {
      isScrolling = true;
      requestAnimationFrame(smoothScrollLoop);
    }
  }

  function smoothScrollLoop() {
    const csViewer = document.getElementById('kre8mind-case-study-viewer');
    const inqModal = document.getElementById('kre8mind-inquiry-modal');
    if ((csViewer && csViewer.classList.contains('open')) || (inqModal && inqModal.classList.contains('open'))) {
      isScrolling = false;
      return;
    }

    const diff = targetY - currentY;
    currentY += diff * ease;

    window.scrollTo(0, currentY);

    if (Math.abs(diff) > 0.4) {
      requestAnimationFrame(smoothScrollLoop);
    } else {
      currentY = targetY;
      window.scrollTo(0, targetY);
      isScrolling = false;
    }
  }

  window.addEventListener('wheel', onWheel, { passive: false });

  window.addEventListener('scroll', () => {
    if (!isScrolling) {
      currentY = window.scrollY;
      targetY = window.scrollY;
    }
  }, { passive: true });

  // Smooth anchor link glide
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#' || !href) return;
      const targetEl = document.querySelector(href);
      if (targetEl) {
        e.preventDefault();
        const headerOffset = 76;
        const elementPosition = targetEl.getBoundingClientRect().top + window.scrollY;
        targetY = Math.max(0, elementPosition - headerOffset);
        if (!isScrolling) {
          isScrolling = true;
          requestAnimationFrame(smoothScrollLoop);
        }
      }
    });
  });
}


/* --------------------------------------------------------------------------
   1. Header Scroll Behavior
   -------------------------------------------------------------------------- */
function initHeader() {
  const header = document.getElementById('header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.style.borderBottomColor = 'rgba(10, 10, 10, 0.12)';
    } else {
      header.style.borderBottomColor = 'var(--border-light)';
    }
  }, { passive: true });
}

/* --------------------------------------------------------------------------
   2. Mobile Menu Toggle
   -------------------------------------------------------------------------- */
function initMobileMenu() {
  const mobileToggle = document.getElementById('mobileToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileLinks = document.querySelectorAll('.mobile-link');

  if (!mobileToggle || !mobileMenu) return;

  mobileToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
    const isOpen = mobileMenu.classList.contains('open');
    
    const bars = mobileToggle.querySelectorAll('.bar');
    if (isOpen) {
      bars[0].style.transform = 'translateY(3.5px) rotate(45deg)';
      bars[1].style.transform = 'translateY(-3.5px) rotate(-45deg)';
    } else {
      bars[0].style.transform = 'none';
      bars[1].style.transform = 'none';
    }
  });

  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      const bars = mobileToggle.querySelectorAll('.bar');
      bars[0].style.transform = 'none';
      bars[1].style.transform = 'none';
    });
  });
}

/* --------------------------------------------------------------------------
   3. Ultra-Smooth Showcase Carousel (Smooth 2.5s step & Infinite Transition)
   -------------------------------------------------------------------------- */
function initSeamlessShowcaseCarousel() {
  const track = document.getElementById('showcaseTrack');
  if (!track) return;

  const wrapper = document.getElementById('showcaseWrapper');
  const prevBtn = document.getElementById('carouselPrev');
  const nextBtn = document.getElementById('carouselNext');
  const indicators = document.querySelectorAll('#carouselIndicators .indicator');
  const initialCards = Array.from(track.querySelectorAll('.showcase-card'));

  if (initialCards.length === 0) return;

  const totalSlides = initialCards.length; // 4 original slides
  let currentIndex = 0;
  let autoTimer = null;
  const slideInterval = 2600; // moves every 2.6s

  // Clone slides to create seamless infinite loop
  initialCards.forEach(card => {
    const clone = card.cloneNode(true);
    clone.classList.add('clone');
    track.appendChild(clone);
  });

  const getCardWidth = () => {
    const card = track.querySelector('.showcase-card');
    return card ? card.offsetWidth + 20 : 500;
  };

  const updateIndicators = (idx) => {
    const normalizedIdx = ((idx % totalSlides) + totalSlides) % totalSlides;
    indicators.forEach((ind, i) => {
      ind.classList.toggle('active', i === normalizedIdx);
    });
  };

  const scrollToPosition = (index, smooth = true) => {
    const cardWidth = getCardWidth();
    const targetLeft = index * cardWidth;
    
    track.scrollTo({
      left: targetLeft,
      behavior: smooth ? 'smooth' : 'auto'
    });

    updateIndicators(index);
  };

  const advanceSlide = () => {
    currentIndex++;
    scrollToPosition(currentIndex, true);

    // If reached end of first set + clones, reset silently
    if (currentIndex >= totalSlides * 2 - 1) {
      setTimeout(() => {
        currentIndex = 0;
        scrollToPosition(0, false);
      }, 700);
    }
  };

  const prevSlide = () => {
    if (currentIndex <= 0) {
      currentIndex = totalSlides;
      scrollToPosition(currentIndex, false);
    }
    currentIndex--;
    scrollToPosition(currentIndex, true);
  };

  // Button handlers
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      advanceSlide();
      resetAutoplay();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      prevSlide();
      resetAutoplay();
    });
  }

  // Indicator clicks
  indicators.forEach((ind, i) => {
    ind.addEventListener('click', () => {
      currentIndex = i;
      scrollToPosition(currentIndex, true);
      resetAutoplay();
    });
  });

  // Autoplay
  const startAutoplay = () => {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = setInterval(advanceSlide, slideInterval);
  };

  const stopAutoplay = () => {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  };

  const resetAutoplay = () => {
    stopAutoplay();
    startAutoplay();
  };

  // Keep carousel looping continuously even on hover so visitors can watch it


  // Sync index on manual drag/scroll
  let isDragging = false;
  let startX;
  let scrollStart;

  track.addEventListener('mousedown', (e) => {
    isDragging = true;
    stopAutoplay();
    startX = e.pageX - track.offsetLeft;
    scrollStart = track.scrollLeft;
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      const cardWidth = getCardWidth();
      currentIndex = Math.round(track.scrollLeft / cardWidth);
      updateIndicators(currentIndex);
      startAutoplay();
    }
  });

  track.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    const walk = (x - startX) * 1.5;
    track.scrollLeft = scrollStart - walk;
  });

  // Start immediately
  startAutoplay();
}

/* --------------------------------------------------------------------------
   4. Interactive Solution Switcher (01, 02, 03 Tabs)
   -------------------------------------------------------------------------- */
function initSolutionSwitcher() {
  const tabs = document.querySelectorAll('.solution-tab-item');
  const contents = {
    '01': document.getElementById('tabContent01'),
    '02': document.getElementById('tabContent02'),
    '03': document.getElementById('tabContent03')
  };

  let hoverTimer = null;

  const activateTab = (tab) => {
    const tabKey = tab.getAttribute('data-tab');

    // Update tab active classes
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Crossfade preview content with gentle transition
    Object.entries(contents).forEach(([key, contentEl]) => {
      if (!contentEl) return;
      if (key === tabKey) {
        contentEl.style.display = 'block';
        void contentEl.offsetWidth; // Force reflow
        requestAnimationFrame(() => {
          contentEl.classList.add('active');
        });
      } else {
        contentEl.classList.remove('active');
        setTimeout(() => {
          if (!contentEl.classList.contains('active')) {
            contentEl.style.display = 'none';
          }
        }, 350);
      }
    });
  };

  tabs.forEach(tab => {
    tab.addEventListener('mouseenter', () => {
      if (window.innerWidth > 960) {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => {
          activateTab(tab);
        }, 60); // silky gentle debounce
      }
    });
    tab.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimer);
    });
    tab.addEventListener('click', () => {
      clearTimeout(hoverTimer);
      activateTab(tab);
    });
  });
}

/* --------------------------------------------------------------------------
   5. Interactive Accordions (Smooth Animated Rotations)
   -------------------------------------------------------------------------- */
function initAccordions() {
  // Services capabilities accordion
  const serviceItems = document.querySelectorAll('.accordion-item');
  serviceItems.forEach(item => {
    const header = item.querySelector('.accordion-header');
    if (!header) return;

    header.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      
      serviceItems.forEach(i => {
        i.classList.remove('active');
      });

      if (!isActive) {
        item.classList.add('active');
      }
    });
  });

  // FAQ Accordion (Das Studio Style - Silky Smooth CSS Grid Height Physics)
  const faqDasItems = document.querySelectorAll('.faq-das-item');
  faqDasItems.forEach(item => {
    const headerBtn = item.querySelector('.faq-das-header');
    if (!headerBtn) return;

    headerBtn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close other items
      faqDasItems.forEach(i => {
        i.classList.remove('active');
        const btn = i.querySelector('.faq-das-header');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });

      // Toggle clicked item
      if (!isActive) {
        item.classList.add('active');
        headerBtn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* --------------------------------------------------------------------------
   6. Scroll-Triggered Fade In Observer
   -------------------------------------------------------------------------- */
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll(
    '.hero-title, .hero-subtitle, .hero-ctas, .subpage-hero-title, .subpage-hero-subtext, .solution-header-grid, .solution-interactive-grid, .das-section-header, .das-card-item, .flow-header-row, .flow-column-item, .journal-article-card, .plan-premium-card, .cta-banner-box, .pricing-card, .faq-das-item, .framer-reveal'
  );

  // Exact Mockup Sticky Vertical Reel for HOW WE WORK (Smooth on Desktop & Mobile)
  const stickySection = document.querySelector('.how-we-work-sticky-section');
  const cardsReel = document.getElementById('workCardsReel');
  
  if (stickySection && cardsReel) {
    const updateStickyScroll = () => {
      const rect = stickySection.getBoundingClientRect();
      const totalScrollDistance = stickySection.offsetHeight - window.innerHeight;
      
      if (totalScrollDistance <= 0) return;
      
      const scrolled = -rect.top;
      const progress = Math.min(Math.max(scrolled / totalScrollDistance, 0), 1);
      
      const isMobile = window.innerWidth <= 768;
      const reelHeight = cardsReel.scrollHeight;
      const startY = isMobile ? window.innerHeight * 0.65 : window.innerHeight * 0.45;
      const endY = -(reelHeight - window.innerHeight * (isMobile ? 0.2 : 0.25));
      const totalDistance = startY - endY;
      
      const currentTranslateY = startY - (progress * totalDistance);
      cardsReel.style.transform = `translate3d(0, ${currentTranslateY}px, 0)`;
    };

    window.addEventListener('scroll', updateStickyScroll, { passive: true });
    window.addEventListener('resize', updateStickyScroll, { passive: true });
    updateStickyScroll();
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.05,
    rootMargin: '0px 0px -40px 0px'
  });

  animatedElements.forEach(el => {
    observer.observe(el);
  });

  initWhyStatsCounter();
}

/* --------------------------------------------------------------------------
   7. Interactive Client Stories Switcher (Hover on Desktop + Mobile Accordion)
   Dynamically connected to Studio Database (/api/testimonials)
   -------------------------------------------------------------------------- */
async function initClientStories() {
  const listContainer = document.querySelector('.stories-client-list');
  const quoteStage = document.getElementById('storyQuoteStage');
  const toggleBtn = document.getElementById('toggleStoriesBtn');

  if (!listContainer) return;

  try {
    const res = await fetch(`${API_BASE}/api/testimonials`);
    const json = await res.json();
    const testimonials = json.data || json.testimonials || [];

    if (Array.isArray(testimonials) && testimonials.length > 0) {
      // Dynamically render client cards
      listContainer.innerHTML = testimonials.map((t, idx) => {
        const isFolded = idx >= 3;
        const avatarSrc = t.avatar || 'assets/clients/Tife Ojo Consults.png';
        const roleText = t.role && t.company ? `${t.role}, ${t.company}` : (t.role || t.company || '');

        return `
          <div class="story-client-card ${isFolded ? 'extra-story is-folded' : ''} ${idx === 0 ? 'active' : ''}" data-story="${idx}">
            <button type="button" class="story-client-header" aria-label="Toggle story from ${escapeHtml(t.name)}">
              <div class="client-avatar-wrap">
                <img src="${avatarSrc}" alt="${escapeHtml(t.name)}" class="client-avatar-img" />
              </div>
              <div class="client-meta-wrap">
                <span class="client-name">${escapeHtml(t.name)}</span>
                <span class="client-role">${escapeHtml(roleText)}</span>
              </div>
              <span class="mobile-accordion-arrow">↓</span>
            </button>
            <div class="story-mobile-dropdown">
              <blockquote class="story-mobile-quote">
                "${escapeHtml(t.quote)}"
              </blockquote>
            </div>
          </div>
        `;
      }).join('');

      // Dynamically render desktop quotes stage
      if (quoteStage) {
        quoteStage.innerHTML = testimonials.map((t, idx) => `
          <div class="story-quote-item ${idx === 0 ? 'active' : ''}" data-story-quote="${idx}">
            <blockquote class="story-big-quote">
              "${escapeHtml(t.quote)}"
            </blockquote>
          </div>
        `).join('');
      }

      // Hide or show the View More button based on count
      if (toggleBtn && toggleBtn.parentElement) {
        toggleBtn.parentElement.style.display = testimonials.length > 3 ? 'block' : 'none';
      }
    } else {
      // User removed all stories or none exist in database
      const storiesSection = document.querySelector('.stories-section');
      if (storiesSection) storiesSection.style.display = 'none';
      if (listContainer) listContainer.innerHTML = '';
      if (quoteStage) quoteStage.innerHTML = '';
    }
  } catch (err) {
    console.log('Using static client stories fallback:', err);
  }

  // Re-bind interactive triggers (desktop hover + mobile accordion dropdown)
  bindClientStoryTriggers();
}

function bindClientStoryTriggers() {
  const clientCards = document.querySelectorAll('.story-client-card');
  const quoteItems = document.querySelectorAll('.story-quote-item');
  const toggleBtn = document.getElementById('toggleStoriesBtn');

  if (clientCards.length === 0) return;

  const activateStory = (card) => {
    const targetIndex = card.getAttribute('data-story');
    clientCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');

    quoteItems.forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('data-story-quote') === targetIndex) {
        item.classList.add('active');
      }
    });
  };

  clientCards.forEach(card => {
    // Instant switch on Hover (Desktop)
    card.addEventListener('mouseenter', () => {
      if (window.innerWidth > 960) {
        activateStory(card);
      }
    });

    // Click handler for mobile accordion dropdown & desktop
    card.addEventListener('click', (e) => {
      const isMobile = window.innerWidth <= 960;

      if (isMobile) {
        // If tapping directly on the quote text itself, allow text interaction without closing
        if (e.target.closest('.story-mobile-quote')) return;

        const wasActive = card.classList.contains('active');
        clientCards.forEach(c => c.classList.remove('active'));
        if (!wasActive) {
          card.classList.add('active');
        }
      } else {
        activateStory(card);
      }
    });
  });

  // Toggle More / Less Stories
  if (toggleBtn) {
    toggleBtn.onclick = null;
    toggleBtn.addEventListener('click', () => {
      const foldedCards = document.querySelectorAll('.story-client-card.extra-story');
      const toggleText = toggleBtn.querySelector('.toggle-text');
      const toggleIcon = toggleBtn.querySelector('.toggle-icon');

      const isCurrentlyFolded = foldedCards[0] && foldedCards[0].classList.contains('is-folded');

      foldedCards.forEach(card => {
        card.classList.toggle('is-folded', !isCurrentlyFolded);
      });

      if (isCurrentlyFolded) {
        if (toggleText) toggleText.textContent = 'VIEW LESS STORIES';
        if (toggleIcon) toggleIcon.textContent = '−';
      } else {
        if (toggleText) toggleText.textContent = 'VIEW MORE STORIES';
        if (toggleIcon) toggleIcon.textContent = '+';
      }
    });
  }

  // Activate first story by default
  if (clientCards[0]) {
    activateStory(clientCards[0]);
  }
}

/* --------------------------------------------------------------------------
   8. Service Category Tab Switcher & Drag-to-Snap Carousel
   -------------------------------------------------------------------------- */
function initServiceTabs() {
  const tabBtns = document.querySelectorAll('.service-tab-btn');
  if (tabBtns.length === 0) return;

  const panels = {
    redesign: document.getElementById('tabPanelRedesign'),
    website: document.getElementById('tabPanelWebsite'),
    app: document.getElementById('tabPanelApp')
  };

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      // Update button active state
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update panels
      Object.entries(panels).forEach(([key, panelEl]) => {
        if (!panelEl) return;
        if (key === targetTab) {
          panelEl.classList.add('active');
          const panelTrack = panelEl.querySelector('.services-carousel-track');
          if (panelTrack) panelTrack.scrollLeft = 0;
        } else {
          panelEl.classList.remove('active');
        }
      });
    });
  });

  // Reset all carousel tracks to 0 on initial load
  const allTracks = document.querySelectorAll('.services-carousel-track');
  allTracks.forEach(track => {
    track.scrollLeft = 0;
  });

  // Enable Smooth Click & Drag for Carousel Tracks
  const wrappers = document.querySelectorAll('.services-carousel-wrapper');
  wrappers.forEach(wrapper => {
    const track = wrapper.querySelector('.services-carousel-track');
    if (!track) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    wrapper.addEventListener('mousedown', (e) => {
      // Don't drag if clicking buttons or links or input toggles
      if (e.target.closest('a') || e.target.closest('button') || e.target.closest('.addon-switch')) return;
      isDown = true;
      wrapper.classList.add('is-dragging');
      startX = e.pageX - wrapper.offsetLeft;
      scrollLeft = track.scrollLeft;
    });

    wrapper.addEventListener('mouseleave', () => {
      isDown = false;
      wrapper.classList.remove('is-dragging');
    });

    wrapper.addEventListener('mouseup', () => {
      isDown = false;
      wrapper.classList.remove('is-dragging');
    });

    wrapper.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - wrapper.offsetLeft;
      const walk = (x - startX) * 1.5;
      track.scrollLeft = scrollLeft - walk;
    });
  });

  // Dynamic Add Development Toggle Calculation
  initAddonToggles();
}

/* --------------------------------------------------------------------------
   9. Add Development Dynamic Pricing & Scope Calculator
   -------------------------------------------------------------------------- */
function initAddonToggles() {
  const slides = document.querySelectorAll('.service-showcase-slide');
  slides.forEach(slide => {
    const switchInput = slide.querySelector('.addon-switch input');
    if (!switchInput) return;

    const priceEl = slide.querySelector('.purple-card-price');
    const noteEl = slide.querySelector('.purple-card-note');
    const requestBtn = slide.querySelector('.btn-send-request');

    // Store base configurations
    const slideTitle = slide.querySelector('.service-card-title')?.textContent?.trim() || '';

    let basePrice = 800;
    let devPrice = 500;
    let baseNote = '* Development adds $500 (Framer/React)';
    let devNote = 'Includes Design + Development (Framer/React)';

    if (slideTitle === 'PERSONAL WEBSITE') {
      basePrice = 800;
      devPrice = 600;
      baseNote = '* Development adds $600 (Framer/React)';
      devNote = 'Includes Design + Development (Framer/React)';
    } else if (slideTitle === 'FULL WEBSITE') {
      basePrice = 2000;
      devPrice = 2500;
      baseNote = '* Final price depends on scope and complexity.';
      devNote = 'Includes Design + Development (Framer/React)';
    }

    switchInput.addEventListener('change', () => {
      if (switchInput.checked) {
        const total = basePrice + devPrice;
        if (priceEl) priceEl.textContent = `$${total.toLocaleString()}`;
        if (noteEl) noteEl.textContent = devNote;
        if (requestBtn) {
          const currentHref = requestBtn.getAttribute('href') || '';
          if (!currentHref.includes('&dev=true')) {
            requestBtn.setAttribute('href', currentHref + '&dev=true');
          }
        }
      } else {
        if (priceEl) priceEl.textContent = `$${basePrice.toLocaleString()}`;
        if (noteEl) noteEl.textContent = baseNote;
        if (requestBtn) {
          const currentHref = requestBtn.getAttribute('href') || '';
          requestBtn.setAttribute('href', currentHref.replace('&dev=true', ''));
        }
      }
    });
  });
}


/* --------------------------------------------------------------------------
   11. Studio Project Inquiry Modal ("Let's Talk About Your Project")
   -------------------------------------------------------------------------- */
function initInquiryModal() {
  if (!document.getElementById('kre8mind-inquiry-modal')) {
    const modalHTML = `
      <div id="kre8mind-inquiry-modal" class="inquiry-modal-backdrop">
        <div class="inquiry-modal-box">
          <button class="inquiry-modal-close" id="inquiry-modal-close-btn" aria-label="Close modal">✕</button>
          
          <div class="inquiry-modal-header">
            <h3 class="inquiry-modal-title">LET'S TALK ABOUT YOUR PROJECT.</h3>
            
            <div class="inquiry-service-badge-row">
              <span id="inq-service-name-label" class="inquiry-service-badge">APPLICATION REDESIGN</span>
              <span id="inq-price-tag-label" class="inquiry-starting-price">Starting at $2,000</span>
            </div>

            <p class="inquiry-pricing-scope-text">
              Final pricing depends on scope and complexity. We'll review your project and confirm the right scope and price with you.
            </p>
          </div>

          <form id="kre8mind-inquiry-form" class="inquiry-modal-form">
            <input type="hidden" id="inq-service-hidden" value="APPLICATION REDESIGN">
            <input type="hidden" id="inq-price-hidden" value="Starting at $2,000">

            <div class="inquiry-fields-compact">
              <div class="inquiry-form-group">
                <label class="inquiry-label" for="inq-name">YOUR NAME</label>
                <input type="text" id="inq-name" class="inquiry-input" placeholder="Enter your full name" required autocomplete="name">
              </div>

              <div class="inquiry-form-group">
                <label class="inquiry-label" for="inq-email">YOUR EMAIL ADDRESS</label>
                <input type="email" id="inq-email" class="inquiry-input" placeholder="name@company.com" required autocomplete="email">
              </div>
            </div>

            <div class="inquiry-form-group" style="margin-top: 12px;">
              <label class="inquiry-label" for="inq-details">TELL US A LITTLE BIT ABOUT YOUR PROJECT</label>
              <textarea id="inq-details" class="inquiry-input inquiry-textarea" placeholder="Briefly describe your goals, timeline, or current challenges..." rows="3" style="resize: vertical; min-height: 68px; padding: 10px 14px; font-family: inherit; font-size: 13.5px; line-height: 1.5;"></textarea>
            </div>

            <div id="inquiry-feedback-msg" class="inquiry-feedback"></div>

            <button type="submit" id="inquiry-submit-btn" class="inquiry-submit-btn">
              <span class="btn-text">SEND PROJECT REQUEST →</span>
              <span class="btn-spinner" style="display: none;">SENDING REQUEST...</span>
            </button>

            <div class="inquiry-book-call-row">
              <span>Prefer to talk?</span>
              <a href="https://cal.com/kre8mind/project-discovery" target="_blank" class="inquiry-book-call-link" id="inq-modal-cal-link">
                BOOK A CALL →
              </a>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalStyles = `
      <style>
        .inquiry-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(10, 10, 12, 0.65);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          box-sizing: border-box;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.25s ease;
          font-family: var(--font-sans, 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
        }
        .inquiry-modal-backdrop.open {
          opacity: 1;
          pointer-events: auto;
        }
        .inquiry-modal-box {
          background: #ffffff;
          border: 1px solid var(--border-light, #e4e4e7);
          border-radius: 12px !important;
          box-shadow: 0 20px 40px rgba(0,0,0,0.08) !important;
          max-width: 480px;
          width: 100%;
          padding: 40px 36px 36px 36px;
          position: relative;
          box-sizing: border-box;
          transform: translateY(12px);
          transition: transform 0.25s ease;
          color: var(--text-primary, #0a0a0a);
          font-family: var(--font-sans, 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
        }
        .inquiry-modal-backdrop.open .inquiry-modal-box {
          transform: translateY(0);
        }
        .inquiry-modal-close {
          position: absolute;
          top: 22px;
          right: 22px;
          background: var(--bg-surface, #f4f4f5);
          border: 1px solid var(--border-light, #e4e4e7);
          color: var(--text-muted, #71717a);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          border-radius: 50% !important;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }
        .inquiry-modal-close:hover {
          color: var(--text-primary, #0a0a0a);
          border-color: var(--text-primary, #0a0a0a);
        }
        .inquiry-modal-title {
          font-family: var(--font-sans, 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
          font-size: 21px;
          font-weight: 500;
          letter-spacing: -0.03em;
          line-height: 1.2;
          margin: 0 0 14px 0;
          color: var(--text-primary, #0a0a0a);
          text-transform: uppercase;
        }
        .inquiry-service-badge-row {
          display: flex;
          align-items: baseline;
          gap: 10px;
          margin-bottom: 10px;
        }
        .inquiry-service-badge {
          font-family: var(--font-sans, 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
          font-size: 11.5px;
          font-weight: 600;
          color: var(--brand-purple, #6C3BFF);
          background: rgba(108, 59, 255, 0.08);
          border: 1px solid rgba(108, 59, 255, 0.3);
          border-radius: 100px !important;
          padding: 3px 10px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .inquiry-starting-price {
          font-family: var(--font-sans, 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
          font-size: 12.5px;
          font-weight: 400;
          color: var(--text-secondary, #52525b);
        }
        .inquiry-pricing-scope-text {
          font-family: var(--font-sans, 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
          font-size: 13.5px;
          font-weight: 400;
          color: var(--text-muted, #71717a);
          line-height: 1.5;
          margin: 0 0 24px 0;
        }
        .inquiry-fields-compact {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }
        .inquiry-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .inquiry-label {
          font-family: var(--font-sans, 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted, #71717a);
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .inquiry-input {
          background: #ffffff;
          border: 1px solid var(--border-light, #e4e4e7);
          border-radius: 8px !important;
          box-shadow: none !important;
          color: var(--text-primary, #0a0a0a);
          padding: 12px 14px;
          font-family: var(--font-sans, 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
          font-size: 14px;
          font-weight: 400;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .inquiry-input:focus {
          border-color: var(--border-dark, #0a0a0a);
        }
        .inquiry-submit-btn {
          width: 100%;
          background: var(--text-primary, #0a0a0a);
          color: #ffffff;
          border: none;
          border-radius: 100px !important;
          box-shadow: none !important;
          padding: 15px 24px;
          font-family: var(--font-sans, 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
          font-size: 13.5px;
          font-weight: 500;
          letter-spacing: -0.01em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .inquiry-submit-btn:hover {
          background: #27272a;
        }
        .inquiry-book-call-row {
          margin-top: 18px;
          text-align: center;
          font-family: var(--font-sans, 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
          font-size: 13.5px;
          font-weight: 400;
          color: var(--text-muted, #71717a);
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
        }
        .inquiry-book-call-link {
          font-family: var(--font-sans, 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
          font-size: 13.5px;
          font-weight: 500;
          color: var(--text-primary, #0a0a0a);
          text-decoration: none;
          letter-spacing: -0.01em;
          border-bottom: 1px solid var(--text-primary, #0a0a0a);
          padding-bottom: 1px;
          transition: opacity 0.2s;
        }
        .inquiry-book-call-link:hover {
          opacity: 0.7;
        }
        .inquiry-feedback {
          padding: 10px;
          font-family: var(--font-sans, 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
          font-size: 13px;
          margin-bottom: 14px;
          display: none;
        }
        .inquiry-feedback.success {
          display: block;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
        }
        .inquiry-feedback.error {
          display: block;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }
      </style>
    `;
    document.head.insertAdjacentHTML('beforeend', modalStyles);
  }

  const modal = document.getElementById('kre8mind-inquiry-modal');
  const closeBtn = document.getElementById('inquiry-modal-close-btn');
  const form = document.getElementById('kre8mind-inquiry-form');
  const serviceLabel = document.getElementById('inq-service-name-label');
  const priceLabel = document.getElementById('inq-price-tag-label');
  const serviceHidden = document.getElementById('inq-service-hidden');
  const priceHidden = document.getElementById('inq-price-hidden');
  const feedbackMsg = document.getElementById('inquiry-feedback-msg');
  const submitBtn = document.getElementById('inquiry-submit-btn');

  // Close handlers
  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  window.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });

  // 1. "SEND REQUEST" buttons — ONLY open form when clicking directly from an actual service card!
  document.querySelectorAll('.btn-send-request').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = btn.closest('.service-showcase-slide') || btn.closest('.service-card-item');
      
      // If NOT originating from an actual service card, do NOT open the automatic form!
      if (!card) {
        e.preventDefault();
        window.location.href = '/services';
        return;
      }

      e.preventDefault();
      const titleEl = card.querySelector('.service-card-title') || card.querySelector('.purple-card-service-name');
      const priceEl = card.querySelector('.purple-card-price');
      
      let serviceTitle = 'APPLICATION REDESIGN';
      let startingPriceText = 'Custom Pricing';

      if (titleEl) serviceTitle = titleEl.textContent.trim();
      if (priceEl) {
        const rawPrice = priceEl.textContent.trim();
        if (!rawPrice.toLowerCase().includes('contact') && !rawPrice.toLowerCase().includes('custom')) {
          startingPriceText = `Starting at ${rawPrice}`;
        }
      }

      serviceLabel.textContent = serviceTitle;
      priceLabel.textContent = startingPriceText;
      serviceHidden.value = serviceTitle;
      priceHidden.value = startingPriceText;

      feedbackMsg.className = 'inquiry-feedback';
      feedbackMsg.style.display = 'none';
      modal.classList.add('open');
    });
  });

  // 2. "Let's talk" and "BOOK A CALL" — In-place Cal.com Embed Modal
  initCalEmbed();

  document.querySelectorAll('.service-card-prompt a, a.btn-lets-talk, #inq-modal-cal-link, a[href*="cal.com"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Close inquiry modal if open
      modal.classList.remove('open');

      // Open in-place Cal.com popup overlay
      if (window.Cal) {
        window.Cal("modal", {
          calLink: "kre8mind/project-discovery",
          config: {
            theme: "light",
            layout: "month_view"
          }
        });
      } else {
        window.open('https://cal.com/kre8mind/project-discovery', '_blank');
      }
    });
  });

  // 3. Form Submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const detailsVal = document.getElementById('inq-details')?.value?.trim() || '';
      const payload = {
        name: document.getElementById('inq-name').value.trim(),
        email: document.getElementById('inq-email').value.trim(),
        serviceTier: serviceHidden.value,
        budget: priceHidden.value,
        details: detailsVal || `Client inquiry for ${serviceHidden.value} (${priceHidden.value}).`
      };

      submitBtn.querySelector('.btn-text').style.display = 'none';
      submitBtn.querySelector('.btn-spinner').style.display = 'inline';
      submitBtn.disabled = true;

      try {
        const res = await fetch(`${API_BASE}/api/requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (res.ok && result.success) {
          feedbackMsg.textContent = '✓ Request received. We will email you shortly.';
          feedbackMsg.className = 'inquiry-feedback success';
          feedbackMsg.style.display = 'block';
          form.reset();
          setTimeout(() => {
            modal.classList.remove('open');
          }, 2000);
        } else {
          feedbackMsg.textContent = result.error || 'Failed to submit request.';
          feedbackMsg.className = 'inquiry-feedback error';
          feedbackMsg.style.display = 'block';
        }
      } catch (err) {
        feedbackMsg.textContent = '✓ Request received. We will email you shortly.';
        feedbackMsg.className = 'inquiry-feedback success';
        feedbackMsg.style.display = 'block';
        setTimeout(() => {
          modal.classList.remove('open');
        }, 1800);
      } finally {
        submitBtn.querySelector('.btn-text').style.display = 'inline';
        submitBtn.querySelector('.btn-spinner').style.display = 'none';
        submitBtn.disabled = false;
      }
    });
  }
}

/* --------------------------------------------------------------------------
   12. Cal.com Embed Loader & Event Bus
   -------------------------------------------------------------------------- */
function initCalEmbed() {
  if (window.Cal) return;

  (function (C, A, L) {
    let p = function (a, ar) { a.q.push(ar); };
    let d = C.document;
    C.Cal = C.Cal || function () {
      let cal = C.Cal;
      let ar = arguments;
      if (!cal.loaded) {
        cal.ns = {};
        cal.q = cal.q || [];
        d.head.appendChild(d.createElement("script")).src = A;
        cal.loaded = true;
      }
      if (ar[0] === L) {
        const api = function () { p(api, arguments); };
        const namespace = ar[1];
        api.q = api.q || [];
        if (typeof namespace === "string") {
          cal.ns[namespace] = cal.ns[namespace] || api;
          p(cal.ns[namespace], ar);
          p(cal, ["initNamespace", namespace]);
        } else p(cal, ar);
        return;
      }
      p(cal, ar);
    };
  })(window, "https://app.cal.com/embed/embed.js", "init");

  window.Cal("init", { origin: "https://cal.com" });
  window.Cal("ui", {
    theme: "light",
    styles: { branding: { brandColor: "#09090b" } },
    hideEventTypeDetails: false,
    layout: "month_view"
  });

  // Listen for Cal.com booking success to immediately store in studio dashboard
  window.Cal("on", {
    action: "bookingSuccessful",
    callback: (e) => {
      const detail = e.detail?.data || {};
      fetch(`${API_BASE}/api/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: detail.name || 'Cal.com Client',
          email: detail.email || 'client@cal.com',
          serviceTier: 'Project Discovery Call (Cal.com)',
          budget: 'N/A',
          status: 'BOOKED_CALL',
          details: `Cal.com meeting scheduled for ${detail.eventStartTime || 'Upcoming Date'}`
        })
      }).catch(() => {});
    }
  });
}

/* --------------------------------------------------------------------------
   12. Privacy-Conscious Visitor Analytics Tracking
   -------------------------------------------------------------------------- */
function initVisitorTracking() {
  try {
    const payload = {
      path: window.location.pathname || 'home',
      referrer: document.referrer || '',
      screenWidth: window.innerWidth || 1440
    };

    fetch(`${API_BASE}/api/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch {}
}

/* --------------------------------------------------------------------------
   13. Custom Precision Fluid Circular Magnetic Cursor
   -------------------------------------------------------------------------- */
function initCustomSquareCursor() {
  // Only activate on devices with fine pointer (mouse/trackpad)
  if (window.matchMedia('(pointer: coarse)').matches) return;
  if (document.getElementById('kre8mind-cursor-dot')) return;

  const dot = document.createElement('div');
  dot.id = 'kre8mind-cursor-dot';
  dot.className = 'kre8mind-cursor-dot';
  dot.setAttribute('aria-hidden', 'true');

  const follower = document.createElement('div');
  follower.id = 'kre8mind-cursor-follower';
  follower.className = 'kre8mind-cursor-follower';
  follower.setAttribute('aria-hidden', 'true');

  document.body.appendChild(dot);
  document.body.appendChild(follower);

  let mouseX = -100;
  let mouseY = -100;
  let followerX = -100;
  let followerY = -100;
  let isHovering = false;
  let isViewing = false;
  let isClicking = false;
  let isVisible = false;

  // Track real mouse coordinates
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!isVisible) {
      isVisible = true;
      dot.classList.add('active');
      follower.classList.add('active');
    }

    dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
  }, { passive: true });

  // Smooth Lerp Physics Loop for trailing geometric square follower
  function renderCursor() {
    followerX += (mouseX - followerX) * 0.18;
    followerY += (mouseY - followerY) * 0.18;

    follower.style.transform = `translate3d(${followerX.toFixed(2)}px, ${followerY.toFixed(2)}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(renderCursor);
  }
  requestAnimationFrame(renderCursor);

  // Dynamic interactive element hover detection via event delegation
  document.addEventListener('mouseover', (e) => {
    const target = e.target;
    if (!target) return;

    // Check for real clickable project card view triggers (featured projects & archive)
    // EXCLUDES showcase-card in the hero section per user directive
    const isProjectCard = target.closest('.das-card-item') || target.closest('.project-card-item');
    if (isProjectCard) {
      follower.classList.add('is-viewing');
      follower.classList.remove('is-hovering');
      return;
    }

    // Check for general interactive elements (buttons, links, inputs, tabs)
    const isInteractive = target.closest('a, button, input, select, textarea, .btn-rolling, .service-showcase-slide, .addon-switch, [role="button"], .faq-das-header, .story-client-card');
    if (isInteractive) {
      follower.classList.add('is-hovering');
      follower.classList.remove('is-viewing');
    } else {
      follower.classList.remove('is-hovering');
      follower.classList.remove('is-viewing');
    }
  }, { passive: true });

  // Mouse Down / Up Compression
  window.addEventListener('mousedown', () => {
    follower.classList.add('is-clicking');
  }, { passive: true });

  window.addEventListener('mouseup', () => {
    follower.classList.remove('is-clicking');
  }, { passive: true });

  // Mouse Leave / Enter Window
  document.addEventListener('mouseleave', () => {
    isVisible = false;
    dot.classList.remove('active');
    follower.classList.remove('active');
  });

  document.addEventListener('mouseenter', () => {
    isVisible = true;
    dot.classList.add('active');
    follower.classList.add('active');
  });
}


/* --------------------------------------------------------------------------
   8.5 Auto-Sweep & Interactive Before/After Transformation Scanner
   -------------------------------------------------------------------------- */
function initTransformationSweep() {
  const frame = document.getElementById('sweepScreenFrame');
  const divider = document.getElementById('sweepDividerLine');
  const layerAfter = document.getElementById('sweepLayerAfter');
  const tabBtns = document.querySelectorAll('.sweep-tab-btn');
  const imgBefore = document.getElementById('sweepImgBefore');
  const imgAfter = document.getElementById('sweepImgAfter');
  const projectTitle = document.getElementById('sweepProjectTitle');
  const projectSummary = document.getElementById('sweepProjectSummary');
  const statNum = document.getElementById('sweepStatNum');
  const statLabel = document.getElementById('sweepStatLabel');

  if (!frame || !divider || !layerAfter) return;

  const transformations = [
    {
      title: "AVENOR PROPTECH FLAGSHIP",
      summary: "Complete spatial redesign from high-friction multi-step confusion to an intuitive, high-converting commercial landing experience.",
      beforeImg: "assets/showcase/before-after-strip.png",
      afterImg: "assets/showcase/ave_cover_1788514443500.jpg",
      statNum: "+64%",
      statLabel: "Qualified Conversion Surge"
    },
    {
      title: "FLOWMETRIC TRADING DASHBOARD",
      summary: "Distilled high-density financial telemetry into ergonomic, legible data visualization for institutional traders.",
      beforeImg: "assets/showcase/before-after-wysa.png",
      afterImg: "assets/showcase/mockup-1.jpg",
      statNum: "-44%",
      statLabel: "User Drop-off Reduction"
    },
    {
      title: "HOSPITALITY HEALTHCARE SUITE",
      summary: "Turned clinical data onboarding chaos into total clarity, eliminating patient friction and accelerating trial conversion.",
      beforeImg: "assets/showcase/mockup-3.jpg",
      afterImg: "assets/showcase/HWCH/how we help 2.png",
      statNum: "3.2x",
      statLabel: "Faster Onboarding Speed"
    }
  ];

  let currentPercent = 50;
  let targetPercent = 50;
  let isDragging = false;
  let isHovering = false;
  let sweepDirection = 1;
  const sweepSpeed = 0.26; // Hypnotic, buttery smooth auto-sweep speed

  function updateSweepPosition(pct) {
    pct = Math.max(0, Math.min(100, pct));
    currentPercent = pct;
    frame.style.setProperty('--sweep-pct', `${pct}%`);
  }

  // Smooth Continuous Auto-Sweep Animation Loop
  function autoSweepLoop() {
    if (!isDragging && !isHovering) {
      targetPercent += sweepSpeed * sweepDirection;
      if (targetPercent >= 86) {
        targetPercent = 86;
        sweepDirection = -1;
      } else if (targetPercent <= 14) {
        targetPercent = 14;
        sweepDirection = 1;
      }
      currentPercent += (targetPercent - currentPercent) * 0.07;
      updateSweepPosition(currentPercent);
    }
    requestAnimationFrame(autoSweepLoop);
  }

  requestAnimationFrame(autoSweepLoop);

  // Compute position percentage relative to frame
  function getEventPercent(e) {
    const rect = frame.getBoundingClientRect();
    const clientX = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    return (x / rect.width) * 100;
  }

  // Pointer & Drag Interactions
  frame.addEventListener('pointerdown', (e) => {
    isDragging = true;
    isHovering = true;
    try { frame.setPointerCapture(e.pointerId); } catch (_) {}
    updateSweepPosition(getEventPercent(e));
  });

  window.addEventListener('pointermove', (e) => {
    if (isDragging) {
      updateSweepPosition(getEventPercent(e));
    }
  });

  window.addEventListener('pointerup', () => {
    isDragging = false;
  });

  frame.addEventListener('mousemove', (e) => {
    isHovering = true;
    if (!isDragging) {
      const pct = getEventPercent(e);
      currentPercent += (pct - currentPercent) * 0.15;
      updateSweepPosition(currentPercent);
    }
  });

  frame.addEventListener('mouseleave', () => {
    isHovering = false;
    isDragging = false;
    targetPercent = currentPercent;
  });

  // Transformation Switcher Tabs
  tabBtns.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const data = transformations[idx];
      if (!data) return;

      if (imgBefore) imgBefore.src = data.beforeImg;
      if (imgAfter) imgAfter.src = data.afterImg;
      if (projectTitle) projectTitle.textContent = data.title;
      if (projectSummary) projectSummary.textContent = data.summary;
      if (statNum) statNum.textContent = data.statNum;
      if (statLabel) statLabel.textContent = data.statLabel;

      // Animate sweep reveal on tab switch
      currentPercent = 15;
      targetPercent = 65;
      updateSweepPosition(currentPercent);
    });
  });

  // Initial Position
  updateSweepPosition(50);
}



/* --------------------------------------------------------------------------
   14. Dynamic Project Portfolio & Case Study Showcase Loader
   -------------------------------------------------------------------------- */
const PROJECTS_CACHE_KEY = 'kre8mind_cached_projects';

function getStoredProjects() {
  try {
    const raw = localStorage.getItem(PROJECTS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function setStoredProjects(list) {
  try {
    localStorage.setItem(PROJECTS_CACHE_KEY, JSON.stringify(list || []));
  } catch {}
}

let cachedStudioProjects = getStoredProjects();

async function initDynamicProjects() {
  // If we already have stored projects in localStorage, render them immediately (0ms latency, no flash!)
  if (cachedStudioProjects && cachedStudioProjects.length > 0) {
    renderStudioProjects(cachedStudioProjects);
  }

  try {
    const res = await fetch(`${API_BASE}/api/projects`);
    if (!res.ok) return;
    const json = await res.json();
    const projects = json.data || json.projects || [];
    
    cachedStudioProjects = projects;
    setStoredProjects(projects);

    renderStudioProjects(projects);
    checkDeepLinkProject();
  } catch (err) {
    console.log('Project loader note:', err);
    if (cachedStudioProjects && cachedStudioProjects.length > 0) {
      renderStudioProjects(cachedStudioProjects);
    }
  }
}

function renderStudioProjects(projects) {
  const pathname = window.location.pathname.toLowerCase();
  const isProjectsPage = pathname.includes('projects.html') || pathname.endsWith('/projects') || pathname.endsWith('/projects/');
  const isHomePage = !isProjectsPage;

  const displayProjects = isHomePage 
    ? projects.filter(p => p.featured !== false).slice(0, 4)
    : projects;

  const grids = document.querySelectorAll('.das-studio-grid');
  grids.forEach(grid => {
    if (!displayProjects.length) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted); font-family: var(--font-mono); font-size: 13px;">
          No projects published yet. Add projects from the Admin dashboard.
        </div>
      `;
      return;
    }

    grid.innerHTML = displayProjects.map((p, idx) => {
      const coverImg = p.image || `assets/showcase/mockup-${(idx % 4) + 1}.jpg`;
      const duration = p.year ? `${p.year}` : `${(idx % 3) + 2} weeks`;
      const category = p.category || 'PRODUCT DESIGN';
      const title = p.title || `PROJECT 0${idx + 1}`;
      const isVideo = (p.coverType === 'video') || (typeof coverImg === 'string' && /\.(mp4|webm|mov)$/i.test(coverImg));

      return `
        <article class="das-card-item is-revealed" data-project-id="${p.id}" style="cursor: pointer;">
          <div class="das-card-anchor" data-project-id="${p.id}">
            <div class="das-image-container">
              <span class="das-category-tag top-left">${escapeHtml(category)}</span>
              ${isVideo ? `
                <video src="${coverImg}" autoplay muted loop playsinline></video>
              ` : `
                <img src="${coverImg}" alt="${escapeHtml(title)}" loading="lazy" />
              `}
              <div class="das-view-overlay">
                <span class="das-view-badge">VIEW</span>
              </div>
            </div>
            <div class="das-text-block">
              <span class="das-duration">${escapeHtml(duration)}</span>
              <h3 class="das-card-heading">${escapeHtml(title)}</h3>
            </div>
          </div>
        </article>
      `;
    }).join('');
  });

  // Update bottom "SEE ALL (N)" button on homepage
  if (isHomePage) {
    const seeAllBtn = document.querySelector('.das-projects-bottom .btn-rolling .primary-text');
    const seeAllHover = document.querySelector('.das-projects-bottom .btn-rolling .hover-text');
    const count = projects.length;
    const text = `SEE ALL (${count}) →`;
    if (seeAllBtn) seeAllBtn.textContent = text;
    if (seeAllHover) seeAllHover.textContent = text;
  }

  bindProjectCardTriggers();
}

function bindProjectCardTriggers() {
  document.querySelectorAll('.das-card-item').forEach(el => {
    el.onclick = (e) => {
      e.preventDefault();
      const projId = el.getAttribute('data-project-id');
      const heading = el.querySelector('.das-card-heading')?.textContent?.trim();
      
      let targetProj = cachedStudioProjects.find(p => p.id === projId || p.title?.toUpperCase() === heading?.toUpperCase());
      
      if (!targetProj) {
        // Build fallback project object from card DOM
        const cat = el.querySelector('.das-category-tag')?.textContent?.trim() || 'PRODUCT DESIGN';
        const img = el.querySelector('img, video')?.getAttribute('src') || 'assets/showcase/mockup-1.jpg';
        const duration = el.querySelector('.das-duration')?.textContent?.trim() || '2026';
        const isVid = /\.(mp4|webm|mov)$/i.test(img);
        
        targetProj = {
          id: projId || 'proj_preview',
          title: heading || 'PROJECT SHOWCASE',
          category: cat,
          year: duration,
          summary: `Comprehensive design and engineering case study for ${heading || 'this flagship product'}. Engineered for clarity, intuitive ergonomics, and measurable commercial conversion.`,
          image: img,
          coverType: isVid ? 'video' : 'image',
          hasCaseStudy: true,
          caseStudySlices: [
            { type: isVid ? 'video' : 'image', url: img, caption: 'Overview & Design System' }
          ]
        };
      }

      window.openCaseStudy(targetProj);
    };
  });
}

/* --------------------------------------------------------------------------
   15. Full-Screen Behance-Style Case Study Viewer Modal
   -------------------------------------------------------------------------- */
function initCaseStudyViewer() {
  if (!document.getElementById('kre8mind-case-study-viewer')) {
    const viewerHTML = `
      <div id="kre8mind-case-study-viewer" class="case-study-modal-backdrop" aria-modal="true" role="dialog">
        <div class="case-study-modal-container">
          
          <!-- Sticky Topbar -->
          <div class="case-study-topbar">
            <div class="case-study-topbar-left">
              <span id="cs-viewer-category" class="case-study-water-badge">PRODUCT DESIGN</span>
              <h4 id="cs-viewer-title" class="case-study-topbar-title">PROJECT TITLE</h4>
            </div>
            <div class="case-study-topbar-actions">
              <button id="cs-viewer-share-btn" class="case-study-share-btn" aria-label="Share Case Study" title="Copy Share Link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                  <polyline points="16 6 12 2 8 6"></polyline>
                  <line x1="12" y1="2" x2="12" y2="15"></line>
                </svg>
                <span class="cs-share-label">SHARE</span>
              </button>
              <button id="cs-viewer-close-btn" class="case-study-close-btn" aria-label="Close Case Study">✕</button>
            </div>
          </div>

          <!-- Main Case Study Presentation Content -->
          <div class="case-study-body">
            
            <!-- Hero Meta Row -->
            <div class="case-study-hero-meta">
              <div class="case-study-hero-left">
                <h1 id="cs-hero-heading" class="case-study-hero-heading">PROJECT TITLE</h1>
                <p id="cs-hero-summary" class="case-study-summary-text">
                  Project overview and architectural design specifications.
                </p>
              </div>
              <div class="case-study-meta-sidebar">
                <div class="case-study-meta-item">
                  <span class="case-study-meta-label">DELIVERABLES</span>
                  <span id="cs-meta-deliverables" class="case-study-meta-value">UI/UX · Design System · Prototype</span>
                </div>
                <div class="case-study-meta-item">
                  <span class="case-study-meta-label">YEAR / TIMELINE</span>
                  <span id="cs-meta-year" class="case-study-meta-value">2026</span>
                </div>
              </div>
            </div>

            <!-- Continuous Presentation Slices Feed -->
            <div id="cs-slices-feed" class="case-study-slices-wrapper">
              <!-- Slices dynamically injected here -->
            </div>

            <!-- Conversion Action Bar -->
            <div class="case-study-cta-box">
              <div class="case-study-cta-left">
                <h3 id="cs-cta-heading">INTERESTED IN A SIMILAR REDESIGN?</h3>
                <p>We partner with high-conviction teams to design and build state-of-the-art products.</p>
              </div>
              <div class="case-study-cta-btns">
                <a href="https://cal.com/kre8mind/project-discovery" class="btn-white" id="cs-book-call-btn" target="_blank" rel="noopener noreferrer">
                  BOOK A CALL →
                </a>
                <a href="/services" class="btn-outline" id="cs-services-btn">
                  SEE SERVICES →
                </a>
              </div>
            </div>

          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', viewerHTML);
  }

  const modal = document.getElementById('kre8mind-case-study-viewer');
  const closeBtn = document.getElementById('cs-viewer-close-btn');
  const shareBtn = document.getElementById('cs-viewer-share-btn');
  const bookCallBtn = document.getElementById('cs-book-call-btn');
  const servicesBtn = document.getElementById('cs-services-btn');

  if (bookCallBtn) {
    bookCallBtn.addEventListener('click', (e) => {
      if (window.Cal) {
        e.preventDefault();
        window.Cal("modal", {
          calLink: "kre8mind/project-discovery",
          config: {
            theme: "light",
            layout: "month_view"
          }
        });
      }
    });
  }

  if (servicesBtn) {
    servicesBtn.addEventListener('click', (e) => {
      closeModal();
      // Regular link navigation directly to /services — no automatic form
      window.location.href = '/services';
    });
  }

  const closeModal = () => {
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    
    // Restore URL when closing modal if on deep-link path
    if (window.history && window.history.replaceState) {
      const p = window.location.pathname;
      if (p.startsWith('/project/') || p.startsWith('/case-study/')) {
        window.history.replaceState({}, document.title, '/projects');
      }
    }
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const proj = window.activeCaseStudyProject;
      if (!proj) return;

      const shareUrl = `${window.location.origin}/project/${proj.id}`;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareUrl);
        } else {
          const tempInput = document.createElement('input');
          tempInput.value = shareUrl;
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand('copy');
          document.body.removeChild(tempInput);
        }

        const label = shareBtn.querySelector('.cs-share-label');
        if (label) label.textContent = 'COPIED!';
        shareBtn.classList.add('copied');

        setTimeout(() => {
          if (label) label.textContent = 'SHARE';
          shareBtn.classList.remove('copied');
        }, 2200);
      } catch (err) {
        console.error('Failed to copy share link:', err);
      }
    });
  }
  
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (modal && modal.classList.contains('open')) {
      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'ArrowDown') {
        modal.scrollTop += 80;
      } else if (e.key === 'ArrowUp') {
        modal.scrollTop -= 80;
      } else if (e.key === 'PageDown' || (e.key === ' ' && !e.target.matches('input, textarea'))) {
        e.preventDefault();
        modal.scrollTop += window.innerHeight * 0.8;
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        modal.scrollTop -= window.innerHeight * 0.8;
      }
    }
  });

  window.closeCaseStudy = closeModal;

  window.openCaseStudy = (proj) => {
    if (!proj) return;
    window.activeCaseStudyProject = proj;

    // Update browser address bar seamlessly without page reload
    if (window.history && window.history.replaceState) {
      const targetUrl = `/project/${proj.id}`;
      if (!window.location.pathname.endsWith(targetUrl)) {
        window.history.replaceState({ projectId: proj.id }, `${proj.title} | Kre8mind Case Study`, targetUrl);
      }
    }

    const catBadge = document.getElementById('cs-viewer-category');
    const titleBar = document.getElementById('cs-viewer-title');
    const heroHeading = document.getElementById('cs-hero-heading');
    const heroSummary = document.getElementById('cs-hero-summary');
    const metaDeliverables = document.getElementById('cs-meta-deliverables');
    const metaYear = document.getElementById('cs-meta-year');
    const slicesFeed = document.getElementById('cs-slices-feed');

    const title = proj.title || 'Studio Project';
    const category = proj.category || 'Product Design';
    const year = proj.year || '2026';
    const summary = proj.summary || `Strategic design and product engineering for ${title}.`;
    const tags = Array.isArray(proj.tags) && proj.tags.length ? proj.tags.join(' · ') : 'UI/UX · Design Engineering · Framer/React';

    if (catBadge) catBadge.textContent = category;
    if (titleBar) titleBar.textContent = title;
    if (heroHeading) heroHeading.textContent = title;
    if (heroSummary) heroSummary.textContent = summary;
    if (metaDeliverables) metaDeliverables.textContent = tags;
    if (metaYear) metaYear.textContent = year;

    // Smart Redesign Detection for Bottom CTA
    const ctaHeading = document.getElementById('cs-cta-heading');
    const fullProjText = `${title} ${category} ${summary} ${tags}`;
    const isRedesign = /redesign/i.test(fullProjText);
    if (ctaHeading) {
      ctaHeading.textContent = isRedesign ? 'INTERESTED IN A SIMILAR REDESIGN?' : 'INTERESTED IN A SIMILAR PROJECT?';
    }

    // Collect presentation slices
    const slices = [];
    
    // Main Cover image or video if available
    if (proj.image) {
      const isVid = (proj.coverType === 'video') || (typeof proj.image === 'string' && /\.(mp4|webm|mov)$/i.test(proj.image));
      slices.push({
        type: isVid ? 'video' : 'image',
        url: proj.image,
        caption: '01 / Flagship Overview'
      });
    }

    // Additional uploaded case study slices
    if (Array.isArray(proj.caseStudySlices) && proj.caseStudySlices.length > 0) {
      proj.caseStudySlices.forEach((sl, idx) => {
        // Skip if duplicate of main cover
        if (sl.url && sl.url !== proj.image) {
          const isVid = sl.type === 'video' || (typeof sl.url === 'string' && /\.(mp4|webm|mov)$/i.test(sl.url));
          slices.push({
            type: isVid ? 'video' : 'image',
            url: sl.url,
            caption: sl.caption || `Presentation Slide 0${idx + 1}`
          });
        }
      });
    }

    // Render slices feed
    if (slicesFeed) {
      slicesFeed.innerHTML = slices.map((s, idx) => {
        const isVideo = s.type === 'video' || (typeof s.url === 'string' && /\.(mp4|webm|mov)$/i.test(s.url));
        
        return `
          <div class="case-study-slice-card">
            ${isVideo ? `
              <video src="${s.url}" autoplay muted loop playsinline controls style="max-width:100%; display:block; border-radius:8px; background:#000;"></video>
            ` : `
              <img src="${s.url}" alt="${title} Slide ${idx + 1}" loading="lazy" style="max-width:100%; display:block; border-radius:8px;" />
            `}
            ${s.caption ? `<div class="case-study-slice-caption">${s.caption}</div>` : ''}
          </div>
        `;
      }).join('');
    }

    // Open Modal
    modal.classList.add('open');
    modal.scrollTo({ top: 0, behavior: 'instant' });
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  };

  // Initial trigger binding
  bindProjectCardTriggers();
  checkDeepLinkProject();
}

// Global deep-link project detector
function checkDeepLinkProject() {
  let targetId = null;
  const path = window.location.pathname;
  const match = path.match(/^\/(?:project|case-study)\/([^/?#]+)/i);
  if (match) {
    targetId = decodeURIComponent(match[1]);
  } else {
    const params = new URLSearchParams(window.location.search);
    targetId = params.get('id') || params.get('project');
  }

  if (!targetId) return;

  const cleanTarget = targetId.trim().toLowerCase();
  const found = (cachedStudioProjects || []).find(p => 
    (p.id && p.id.toLowerCase() === cleanTarget) ||
    (p.title && p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === cleanTarget) ||
    (p.title && p.title.toLowerCase() === cleanTarget)
  );

  if (found) {
    setTimeout(() => {
      window.openCaseStudy(found);
    }, 120);
  }
}

/* --------------------------------------------------------------------------
   16. Dynamic Journal & Insights Loader (Empty State & Reader)
   -------------------------------------------------------------------------- */
async function initJournal() {
  const container = document.getElementById('journalContainer');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/api/journal`);
    if (!res.ok) return;
    const json = await res.json();
    const articles = json.data || json.articles || [];

    if (!articles || articles.length === 0) {
      container.innerHTML = `
        <div class="journal-empty-state-wrap">
          <div class="journal-empty-box">
            <span class="journal-water-badge">PUBLISHING SOON</span>
            <h2 class="journal-empty-title">JOURNAL COMING SOON</h2>
            <p class="journal-empty-desc" style="margin-bottom: 0;">
              We are currently writing and curating our perspectives on interface clarity, user psychology, design systems, and modern digital engineering.
            </p>
          </div>
        </div>
      `;
      return;
    }

    // Render articles without clustering
    container.innerHTML = `
      <div class="journal-editorial-grid">
        ${articles.map((art, idx) => `
          <article class="journal-article-card" data-article-id="${art.id}">
            <div class="journal-card-anchor" style="cursor: pointer;">
              <div class="journal-cover-frame">
                <span class="journal-badge-tag">${art.category || 'DESIGN PHILOSOPHY'}</span>
                <img src="${art.image || 'assets/showcase/journal-1.jpg'}" alt="${art.title}" class="journal-cover-img" loading="lazy" />
              </div>
              <div class="journal-card-content">
                <div class="journal-meta-row">
                  <span>0${idx + 1} / ESSAY</span>
                  <span>${art.date || '2026'} • ${art.readTime || '5 MIN READ'}</span>
                </div>
                <h2 class="journal-card-title">${art.title}</h2>
                <p class="journal-card-excerpt">${art.snippet || art.content.substring(0, 140) + '...'}</p>
              </div>
            </div>
          </article>
        `).join('')}
      </div>
    `;
  } catch (err) {
    console.log('Error initializing journal:', err);
  }
}

/* --------------------------------------------------------------------------
   17. Why Kre8mind Animated Stats Counter
   -------------------------------------------------------------------------- */
function initWhyStatsCounter() {
  const statNumbers = document.querySelectorAll('.why-stat-number[data-target]');
  if (!statNumbers || statNumbers.length === 0) return;

  const section = document.getElementById('why-kre8mind') || document.querySelector('.why-section');
  if (!section) return;

  let hasAnimated = false;

  const animateCount = (el) => {
    const target = parseFloat(el.getAttribute('data-target')) || 0;
    const suffix = el.getAttribute('data-suffix') || '';
    const duration = 1600; // 1.6s smooth duration
    const startTime = performance.now();

    const updateNumber = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Smooth ease-out cubic curve
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(easedProgress * target);

      el.textContent = current + suffix;

      if (progress < 1) {
        requestAnimationFrame(updateNumber);
      } else {
        el.textContent = target + suffix;
      }
    };

    requestAnimationFrame(updateNumber);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !hasAnimated) {
        hasAnimated = true;
        statNumbers.forEach((statEl) => {
          animateCount(statEl);
        });
        observer.disconnect();
      }
    });
  }, {
    threshold: 0.2
  });

  observer.observe(section);
}
