/**
 * Renders a comparison slide showing BAD vs GOOD code.
 *
 * @param {Object} options
 * @param {number} options.pageNumber  - Slide number watermark
 * @param {string} options.title       - Short mistake title (e.g., "String Comparison")
 * @param {Object} options.bad         - Bad code: { tokens: [{type, text}] } or { text: "..." }
 * @param {Object} options.good        - Good code: { tokens: [{type, text}] } or { text: "..." }
 * @param {string} options.logoSvg     - Amigoscode logo SVG
 * @param {string} options.arrowSvg    - Arrow SVG
 * @returns {string} HTML markup
 */
export function renderComparison({ pageNumber, title, bad, good, logoSvg, arrowSvg }) {
  function renderTokens(obj) {
    if (obj.tokens) {
      return obj.tokens
        .map(t => t.type === 'plain' ? escapeHtml(t.text) : `<span class="tk-${t.type}">${escapeHtml(t.text)}</span>`)
        .join('');
    }
    return escapeHtml(obj.text || '');
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return `
<div class="slide">
  <div class="logo">${logoSvg}</div>
  <div class="page-number">${pageNumber}</div>
  <div class="compare-body">
    <div class="compare-title">${title}</div>
    <div class="compare-block compare-bad">
      <div class="compare-label compare-label-bad">&#10007; BAD</div>
      <pre class="compare-code">${renderTokens(bad)}</pre>
    </div>
    <div class="compare-block compare-good">
      <div class="compare-label compare-label-good">&#10003; GOOD</div>
      <pre class="compare-code">${renderTokens(good)}</pre>
    </div>
  </div>
  <div class="website">www.amigoscode.com</div>
  <div class="arrow">${arrowSvg}</div>
</div>`;
}
