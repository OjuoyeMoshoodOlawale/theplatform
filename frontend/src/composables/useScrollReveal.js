/**
 * useScrollReveal — IntersectionObserver-based scroll animations
 * Usage: add class="reveal" (or reveal-left / reveal-right) to any element,
 *        then call setupReveal() in onMounted.
 */
export const useScrollReveal = () => {
  const setupReveal = (root = null) => {
    const targets = (root || document).querySelectorAll(
      '.reveal, .reveal-left, .reveal-right'
    );
    if (!targets.length) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    targets.forEach(t => io.observe(t));
  };
  return { setupReveal };
};
