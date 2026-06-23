#!/usr/bin/env node

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { buildCarouselHtml } from '../templates/carousel.html.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Reads the --config-file CLI argument and returns its value.
 *
 * @returns {string} Absolute path to the JSON config file
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const flagIndex = args.indexOf('--config-file');

  if (flagIndex === -1 || flagIndex + 1 >= args.length) {
    console.error('Usage: node generate-carousel.mjs --config-file <path>');
    process.exit(1);
  }

  return path.resolve(args[flagIndex + 1]);
}

/**
 * Creates a URL-friendly slug from a slide title object.
 *
 * @param {Object} title - Title object (command mode or text mode)
 * @returns {string} A lowercase, hyphen-separated slug
 */
function slugify(slide) {
  let raw;
  const title = slide.title;

  if (slide.type === 'comparison') {
    raw = slide.title || 'comparison';
  } else if (title && title.tokens) {
    raw = title.tokens.map(t => t.text).join('');
  } else if (title && title.text) {
    raw = title.text;
  } else if (title) {
    raw = [title.prompt, title.cmd, title.arg].filter(Boolean).join(' ');
  } else {
    raw = 'slide';
  }

  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Reads an SVG file from the assets directory.
 *
 * @param {string} assetsDir - Absolute path to the assets directory
 * @param {string} filename  - Name of the SVG file
 * @returns {string} The SVG file contents as a string
 */
function readAsset(assetsDir, filename) {
  return fs.readFileSync(path.join(assetsDir, filename), 'utf-8');
}

/**
 * Expands a leading ~ to the home directory.
 */
function expandHome(p) {
  return p && p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;
}

/**
 * Resolves a brand asset to an absolute path. Prefers an explicit config path
 * (with ~ expansion); falls back to a bundled file in assetsDir. Returns null
 * when neither exists, so the caller can omit the element.
 *
 * @param {string} [cfgPath]    - Path from config.json (may be empty/undefined)
 * @param {string} assetsDir    - Bundled assets directory
 * @param {string} fallbackName - Bundled filename to fall back to
 * @returns {string|null} Absolute path, or null if nothing is found
 */
function resolveAsset(cfgPath, assetsDir, fallbackName) {
  if (cfgPath) {
    const abs = expandHome(cfgPath);
    if (fs.existsSync(abs)) return abs;
  }
  const fallback = path.join(assetsDir, fallbackName);
  return fs.existsSync(fallback) ? fallback : null;
}

/**
 * Main entry point. Reads config, builds HTML, launches Playwright,
 * screenshots every slide, and prints a JSON result to stdout.
 */
async function main() {
  const configPath = parseArgs();
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  const {
    coverTitle,
    techIconSvg,
    contentSlides,
    outputDir,
    assetsDir,
    footerText = '',
    outroCta = '',
    logoPath,
    outroLogoPath,
    photoPath: photoPathCfg,
    outroPhoto,
  } = config;

  // Structural UI chrome stays bundled with the skill.
  const swipeIconSvg = readAsset(assetsDir, 'swipe-icon.svg');
  const arrowSvg = readAsset(assetsDir, 'arrow-vector.svg');

  // Brand assets: config path first, bundled fallback, omit if missing.
  const logoFile = resolveAsset(logoPath, assetsDir, 'logo.svg');
  const outroLogoFile = resolveAsset(outroLogoPath, assetsDir, 'outro-logo.svg');
  const photoFile = resolveAsset(photoPathCfg || outroPhoto, assetsDir, 'outro-photo.png');

  const logoSvg = logoFile ? fs.readFileSync(logoFile, 'utf-8') : '';
  const outroLogoSvg = outroLogoFile ? fs.readFileSync(outroLogoFile, 'utf-8') : '';
  const photoPath = photoFile ? `file://${photoFile}` : '';

  // Build the full HTML document
  const html = buildCarouselHtml({
    coverTitle,
    techIconSvg,
    contentSlides,
    logoSvg,
    swipeIconSvg,
    arrowSvg,
    outroLogoSvg,
    photoPath,
    footerText,
    outroCta,
  });

  // Ensure the output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  // Write HTML to a temp file
  const tempHtmlPath = path.join(outputDir, '_carousel-temp.html');
  fs.writeFileSync(tempHtmlPath, html, 'utf-8');

  // Launch Playwright and screenshot each slide
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1350 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle' });

  const slides = await page.$$('.slide');
  const filenames = [];
  const totalSlides = slides.length;

  for (let i = 0; i < totalSlides; i++) {
    let filename;

    if (i === 0) {
      filename = '01-cover.png';
    } else if (i === totalSlides - 1) {
      filename = `${String(totalSlides).padStart(2, '0')}-outro.png`;
    } else {
      const slug = slugify(contentSlides[i - 1]);
      filename = `${String(i + 1).padStart(2, '0')}-${slug}.png`;
    }

    const outputPath = path.join(outputDir, filename);
    await slides[i].screenshot({ path: outputPath });
    filenames.push(filename);
  }

  await browser.close();

  // Clean up the temp HTML file
  fs.unlinkSync(tempHtmlPath);

  // Print result as JSON to stdout
  const result = { slides: filenames, outputDir };
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
