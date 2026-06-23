/**
 * Renders the outro (closing) slide for a LinkedIn carousel.
 *
 * @param {Object} options
 * @param {string} options.outroLogoSvg - Inline SVG for the full Amigoscode wordmark
 * @param {string} options.photoPath    - Absolute file:// path to the presenter photo
 * @returns {string} HTML markup for the outro slide
 */
export function renderOutro({ outroLogoSvg, photoPath }) {
  return `
<div class="slide">
  <div class="outro-logo">${outroLogoSvg}</div>
  <p class="outro-text">Like and Follow for more...</p>
  <div class="outro-glow">
    <svg viewBox="0 0 1581 1547" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g filter="url(#og)"><path d="M1081 717.532C1081 899.492 950.939 1047 790.5 1047C630.061 1047 500 899.492 500 717.532C500 535.571 630.061 500 790.5 500C950.939 500 1081 535.571 1081 717.532Z" fill="#7D2AE8"/></g>
      <defs><filter id="og" x="0" y="0" width="1581" height="1547" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="bg"/><feBlend in="SourceGraphic" in2="bg" result="shape"/><feGaussianBlur stdDeviation="250" result="blur"/></filter></defs>
    </svg>
  </div>
  <img class="outro-photo" src="${photoPath}" alt="" />
</div>`;
}
