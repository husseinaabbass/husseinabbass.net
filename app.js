(() => {
  function scrollToCurrentHash() {
    const hash = window.location.hash;
    if (!hash) {
      return;
    }
    const target = document.getElementById(hash.slice(1));
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function configureTickers() {
    const tickers = document.querySelectorAll(".ticker-track");
    tickers.forEach((track) => {
      const ticker = track.closest(".ticker");
      if (!ticker || track.children.length === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }

      const distance = Math.max(track.scrollWidth / 2, ticker.clientWidth);
      const seconds = Math.max(30, Math.round(distance / 44));
      const animation = track.animate(
        [
          { transform: "translateX(0)" },
          { transform: `translateX(-${distance}px)` },
        ],
        {
          duration: seconds * 1000,
          iterations: Infinity,
          easing: "linear",
        }
      );

      ticker.addEventListener("mouseenter", () => animation.pause());
      ticker.addEventListener("mouseleave", () => animation.play());
      ticker.addEventListener("focusin", () => animation.pause());
      ticker.addEventListener("focusout", () => animation.play());
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    configureTickers();
    requestAnimationFrame(() => {
      scrollToCurrentHash();
      [120, 420, 900].forEach((delay) => setTimeout(scrollToCurrentHash, delay));
    });
  });
})();
