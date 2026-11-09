/**
 * site.js
 * Shared logic for the NovaWorks / NuvolaSI project.
 * Handles smooth scrolling, navigation highlighting, and general UI interactions.
 */

document.addEventListener('DOMContentLoaded', () => {
  /**
   * Smooth Scroll Logic
   * Ensures that internal links (e.g., #services) scroll smoothly to the target.
   */
  const smoothScroll = () => {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
      link.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          
          // Calculate offset for potential fixed headers
          const headerHeight = document.querySelector('header').offsetHeight;
          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  };

  /**
   * Navigation Highlighting
   * Updates the active state of the navigation links based on the current URL.
   */
  const updateNavActive = () => {
    const currentPath = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('nav a');

    navLinks.forEach(link => {
      const linkPath = link.getAttribute('href').replace('#', '');
      if (linkPath === currentPath || (linkPath === '' && currentPath === '')) {
        link.setAttribute('aria-current', 'page');
        link.classList.add('active');
      } else {
        link.removeAttribute('aria-current');
        link.classList.remove('active');
      }
    });
  };

  /**
   * Interaction Feedback
   * Handles subtle visual feedback for interactive elements like buttons 
   * that aren't handled by the nuvola_ui.js library.
   */
  const initInteractions = () => {
    const buttons = document.querySelectorAll('button:not([data-tab]), button:not([data-modal-open])');
    
    buttons.forEach(btn => {
      btn.addEventListener('mousedown', () => {
        btn.style.transform = 'scale(0.98)';
      });
      btn.addEventListener('mouseup', () => {
        btn.style.transform = 'scale(1)';
      });
    });
  };

  /**
   * Dynamic Scroll Progress
   * Optional: If a progress bar or scroll-based effects are needed.
   */
  const initScrollEffects = () => {
    const progress = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    // Logic for scroll-based animations can be added here if specific 
    // non-standard behaviors are required beyond nuvola_ui.js
  };

  // Initialize all modules
  smoothScroll();
  updateNavActive();
  initInteractions();
});

/**
 * Utility: Window Resize Handler
 * Ensures that any custom-sized elements or canvas-based elements 
 * (not handled by nuvola_ui) adjust correctly.
 */
window.addEventListener('resize', () => {
  // Standard logic for resizing elements that aren't automatically 
  // handled by the nuvola_ui.js or nuvola_scenes.js scripts.
  const canvasElements = document.querySelectorAll('canvas');
  canvasElements.forEach(canvas => {
    const parent = canvas.parentElement;
    if (parent) {
      const width = parent.offsetWidth;
      const height = parent.offsetHeight;
      const renderer = window.renderer; // Assuming global renderer from nuvola_scenes
      if (renderer) {
        renderer.setSize(width, height);
      }
    }
  });
});