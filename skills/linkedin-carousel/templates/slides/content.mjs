/**
 * Renders a content slide for a LinkedIn carousel.
 *
 * Title supports three modes:
 *   - Command mode: { prompt, cmd, arg } renders a styled terminal command
 *   - Token mode:   { tokens: [{ type, text }] } renders Shiki-style syntax highlighting
 *   - Text mode:    { text } renders plain text
 *
 * Token types: keyword, function, string, number, operator, variable, type,
 *              comment, punctuation, property, plain, prompt, cmd, arg
 *
 * @param {Object} options
 * @param {number} options.pageNumber  - The slide number displayed as a background watermark
 * @param {Object} options.title       - Title object (command, token, or text mode)
 * @param {string} options.description - Body text below the title
 * @param {string} options.logoSvg     - Inline SVG for the Amigoscode logo
 * @param {string} options.arrowSvg    - Inline SVG for the navigation arrow
 * @param {string} [options.iconSvg]   - Optional inline SVG icon for this specific slide
 * @returns {string} HTML markup for the content slide
 */
export function renderContent({ pageNumber, title, description, logoSvg, arrowSvg, iconSvg }) {
  let titleHtml;

  if (title.tokens) {
    titleHtml = title.tokens
      .map(t => t.type === 'plain' ? t.text : `<span class="tk-${t.type}">${t.text}</span>`)
      .join('');
  } else if (title.text) {
    titleHtml = title.text;
  } else {
    titleHtml =
      `<span class="prompt">${title.prompt}</span> ` +
      `<span class="cmd">${title.cmd}</span> ` +
      `<span class="arg">${title.arg}</span>`;
  }

  const iconBlock = iconSvg
    ? `<div class="content-icon">${iconSvg}</div>`
    : '';

  return `
<div class="slide">
  <div class="logo">${logoSvg}</div>
  <div class="page-number">${pageNumber}</div>
  ${iconBlock}
  <div class="content-body">
    <div class="content-title">${titleHtml}</div>
    <div class="content-desc">${description}</div>
  </div>
  <div class="website">www.amigoscode.com</div>
  <div class="arrow">${arrowSvg}</div>
</div>`;
}
