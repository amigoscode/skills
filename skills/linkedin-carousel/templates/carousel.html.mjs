import { renderCover } from './slides/cover.mjs';
import { renderContent } from './slides/content.mjs';
import { renderComparison } from './slides/comparison.mjs';
import { renderOutro } from './slides/outro.mjs';

/**
 * Builds a complete HTML document containing every slide in the carousel.
 *
 * @param {Object} config
 * @param {string}   config.coverTitle     - HTML string for the cover slide title
 * @param {string}   config.techIconSvg    - Inline SVG for the technology icon
 * @param {Object[]} config.contentSlides  - Array of { title, description } objects
 * @param {string}   config.logoSvg        - Inline SVG for the Amigoscode logo mark
 * @param {string}   config.swipeIconSvg   - Inline SVG for the swipe indicator
 * @param {string}   config.arrowSvg       - Inline SVG for the navigation arrow
 * @param {string}   config.outroLogoSvg   - Inline SVG for the full Amigoscode wordmark
 * @param {string}   config.photoPath      - Absolute file:// path to the presenter photo
 * @returns {string} A self-contained HTML document
 */
export function buildCarouselHtml(config) {
  const {
    coverTitle,
    techIconSvg,
    contentSlides,
    logoSvg,
    swipeIconSvg,
    arrowSvg,
    outroLogoSvg,
    photoPath,
  } = config;

  const coverHtml = renderCover({ coverTitle, techIconSvg, logoSvg, swipeIconSvg });

  const contentHtml = contentSlides
    .map((slide, index) => {
      if (slide.type === 'comparison') {
        return renderComparison({
          pageNumber: index + 1,
          title: slide.title,
          bad: slide.bad,
          good: slide.good,
          logoSvg,
          arrowSvg,
        });
      }
      return renderContent({
        pageNumber: index + 1,
        title: slide.title,
        description: slide.description,
        logoSvg,
        arrowSvg,
        iconSvg: slide.iconSvg || '',
      });
    })
    .join('\n');

  const outroHtml = renderOutro({ outroLogoSvg, photoPath });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LinkedIn Carousel</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&family=Inter:wght@600&family=Montserrat:wght@700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: #1a1a1a;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
  padding: 40px;
}
.slide {
  width: 1080px;
  height: 1350px;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(to bottom, #030303 0%, #030303 23.057%, #9a53ff 100%);
}
.logo {
  position: absolute;
  top: 80px;
  left: 100px;
  width: 72px;
  height: 72px;
  z-index: 2;
}
.logo svg { width: 100%; height: 100%; }
.website {
  position: absolute;
  bottom: 102px;
  left: 80px;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 32px;
  line-height: 36px;
  color: white;
  z-index: 2;
}
.cover-title {
  position: absolute;
  top: 50%;
  left: 100px;
  transform: translateY(-50%);
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  font-size: 85px;
  line-height: 1.5;
  letter-spacing: 1.7px;
  color: white;
  text-transform: uppercase;
  width: 880px;
  z-index: 2;
}
.swipe {
  position: absolute;
  top: 85px;
  right: 80px;
  display: flex;
  align-items: center;
  gap: 7px;
  z-index: 2;
}
.swipe-text {
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 32px;
  line-height: 36px;
  color: white;
}
.swipe-icon { width: 62px; height: 72px; }
.swipe-icon svg { width: 100%; height: 100%; }
.cover-topic-logo {
  position: absolute;
  top: 200px;
  right: 80px;
  width: 280px;
  height: 280px;
  z-index: 2;
  opacity: 0.9;
}
.cover-topic-logo svg { width: 100%; height: 100%; }
.cover-glow {
  position: absolute;
  left: 433px;
  top: 831px;
  width: 581px;
  height: 547px;
  z-index: 1;
}
.cover-glow svg {
  position: absolute;
  inset: -91.41% -86.06%;
  width: 272%;
  height: 283%;
}
.page-number {
  position: absolute;
  top: 80px;
  right: -60px;
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  font-size: 450px;
  line-height: 1;
  letter-spacing: 9px;
  text-transform: uppercase;
  color: transparent;
  -webkit-text-stroke: 3px rgba(154, 83, 255, 0.5);
  opacity: 0.3;
  z-index: 1;
  text-align: right;
}
.content-icon {
  position: absolute;
  top: 180px;
  right: 100px;
  width: 180px;
  height: 180px;
  z-index: 2;
  opacity: 0.85;
}
.content-icon svg { width: 100%; height: 100%; }
.content-body {
  position: absolute;
  top: calc(50% + 31px);
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  gap: 40px;
  width: 880px;
  z-index: 2;
}
.content-title {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 62px;
  line-height: 1.4;
  letter-spacing: 0;
  color: white;
  text-transform: none;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 24px 36px;
  display: inline-block;
}
.content-title .prompt {
  color: #9a53ff;
  margin-right: 8px;
}
.content-title .cmd {
  color: #c4b5fd;
}
.content-title .arg {
  color: white;
}
/* Shiki-style syntax highlighting tokens (One Dark Pro inspired) */
.content-title .tk-keyword   { color: #c678dd; }
.content-title .tk-function  { color: #61afef; }
.content-title .tk-string    { color: #98c379; }
.content-title .tk-number    { color: #d19a66; }
.content-title .tk-operator  { color: #56b6c2; }
.content-title .tk-variable  { color: #e06c75; }
.content-title .tk-type      { color: #e5c07b; }
.content-title .tk-comment   { color: #7f848e; font-style: italic; }
.content-title .tk-punctuation { color: #abb2bf; }
.content-title .tk-property  { color: #61afef; }
.content-title .tk-prompt    { color: #9a53ff; margin-right: 8px; }
.content-title .tk-cmd       { color: #c4b5fd; }
.content-title .tk-arg       { color: white; }
.content-desc {
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 30px;
  line-height: 1.5;
  letter-spacing: 0.6px;
  color: white;
}
/* === COMPARISON SLIDE === */
.compare-body {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  gap: 28px;
  width: 880px;
  z-index: 2;
  padding-top: 40px;
}
.compare-title {
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  font-size: 52px;
  line-height: 1.3;
  color: white;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.compare-block {
  border-radius: 16px;
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.compare-bad {
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid rgba(224, 108, 117, 0.6);
}
.compare-good {
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid rgba(152, 195, 121, 0.6);
}
.compare-label {
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 26px;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.compare-label-bad { color: #e06c75; }
.compare-label-good { color: #98c379; }
.compare-code {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  font-size: 36px;
  line-height: 1.5;
  color: #1e1e2e;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
/* Light-theme token colors (for white bg) */
.compare-code .tk-keyword   { color: #7c3aed; }
.compare-code .tk-function  { color: #2563eb; }
.compare-code .tk-string    { color: #16a34a; }
.compare-code .tk-number    { color: #c2410c; }
.compare-code .tk-operator  { color: #0891b2; }
.compare-code .tk-variable  { color: #dc2626; }
.compare-code .tk-type      { color: #b45309; }
.compare-code .tk-comment   { color: #9ca3af; font-style: italic; }
.compare-code .tk-punctuation { color: #6b7280; }
.compare-code .tk-property  { color: #2563eb; }
.arrow {
  position: absolute;
  bottom: 80px;
  right: 80px;
  width: 120px;
  height: 120px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}
.arrow svg { width: 100%; height: 100%; }
.outro-logo {
  position: absolute;
  top: 74px;
  left: 50%;
  transform: translateX(-50%);
  width: 514px;
  height: 92px;
  z-index: 2;
}
.outro-logo svg { width: 100%; height: 100%; }
.outro-text {
  position: absolute;
  top: 494px;
  left: 50%;
  transform: translateX(-50%);
  width: 700px;
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  font-size: 72px;
  line-height: 1.5;
  color: white;
  text-align: center;
  z-index: 2;
}
.outro-photo {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(calc(-50% + 20px));
  width: 773px;
  height: 516px;
  z-index: 2;
  object-fit: cover;
  object-position: top center;
}
.outro-glow {
  position: absolute;
  left: 225px;
  top: 777px;
  width: 581px;
  height: 547px;
  z-index: 1;
}
.outro-glow svg {
  position: absolute;
  inset: -91.41% -86.06%;
  width: 272%;
  height: 283%;
}
  </style>
</head>
<body>
${coverHtml}
${contentHtml}
${outroHtml}
</body>
</html>`;
}
