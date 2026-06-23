/**
 * Renders the cover slide for a LinkedIn carousel.
 *
 * @param {Object} options
 * @param {string} options.coverTitle  - HTML string for the main title
 * @param {string} options.techIconSvg - Inline SVG for the technology icon
 * @param {string} options.logoSvg     - Inline SVG for the brand logo (omitted if empty)
 * @param {string} options.swipeIconSvg - Inline SVG for the swipe indicator
 * @param {string} options.footerText  - Bottom-left footer/website text (omitted if empty)
 * @returns {string} HTML markup for the cover slide
 */
export function renderCover({ coverTitle, techIconSvg, logoSvg, swipeIconSvg, footerText, glow = '#7D2AE8' }) {
  const logoBlock = logoSvg ? `<div class="logo">${logoSvg}</div>` : '';
  const footerBlock = footerText ? `<div class="website">${footerText}</div>` : '';

  return `
<div class="slide">
  ${logoBlock}
  <div class="swipe">
    <span class="swipe-text">Swipe</span>
    <span class="swipe-icon">${swipeIconSvg}</span>
  </div>
  <div class="cover-topic-logo">${techIconSvg}</div>
  <div class="cover-title">${coverTitle}</div>
  ${footerBlock}
  <div class="cover-glow">
    <svg viewBox="0 0 1581 1547" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g filter="url(#cg)"><path d="M1081 717.532C1081 899.492 950.939 1047 790.5 1047C630.061 1047 500 899.492 500 717.532C500 535.571 630.061 500 790.5 500C950.939 500 1081 535.571 1081 717.532Z" fill="${glow}"/></g>
      <defs><filter id="cg" x="0" y="0" width="1581" height="1547" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="bg"/><feBlend in="SourceGraphic" in2="bg" result="shape"/><feGaussianBlur stdDeviation="250" result="blur"/></filter></defs>
    </svg>
  </div>
</div>`;
}
