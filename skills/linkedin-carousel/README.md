# linkedin-carousel

Generate branded 1080x1350px LinkedIn carousel slides for any tech topic, plus a
combined PDF for upload, beat-synced MP4 videos, a GIF, and ready-to-post captions
for LinkedIn, YouTube, and Instagram.

It is packaged as a [Claude Code](https://claude.com/claude-code) skill. The render
core (`scripts/generate-carousel.mjs`) is a standalone Playwright script you can run
on its own.

## Features

- **Branded slides.** Cover, content, comparison, and outro layouts driven by HTML
  templates that mirror the Amigoscode Figma design.
- **Syntax-highlighted titles.** Shiki-style token mode renders SQL, CLI commands,
  and code snippets with One Dark Pro colors. Command and plain-text modes too.
- **Per-slide tech icons.** 430 icons bundled in `assets/tech_icons/`, with a
  techicons.dev download fallback for anything missing.
- **Everything LinkedIn needs.** PNGs, a combined `carousel.pdf`, beat-synced MP4s,
  a silent MP4, a GIF, and three platform captions in one run.
- **Configurable.** Output directory, icon set, Figma config, outro photo, and the
  caption CTA/newsletter lines all live in `config.json`.

## How it works

The skill generates slide content, matches tech icons, writes a config JSON, and
renders each slide with [Playwright](https://playwright.dev) from the HTML templates
in `templates/`. It then combines the PNGs into a PDF, builds beat-synced videos
with `librosa` + `ffmpeg`, and writes captions using the Amigoscode voice.

## Prerequisites

- Node.js 18+ with `npx` available.
- Python 3 with `librosa` (for beat-synced MP4s) and `ffmpeg` on the PATH.
- ImageMagick (`convert`) or the `img2pdf` Python package for the PDF.

## Installation

```bash
cd scripts
npm install
npx playwright install chromium
```

There is no build step.

## Configuration

On first run the skill copies [`config.example.json`](./config.example.json) to
`config.json` (gitignored) and asks for any values you want to change:

```jsonc
{
  "outputDir": "~/carousels",              // where carousels are saved
  "techIconsDir": "assets/tech_icons",     // icon set (relative paths resolve to the skill dir)
  "figmaConfigPath": "assets/figma-config.json",
  "outroPhoto": "assets/outro-photo.png",  // outro slide photo; empty for none
  "ctaLine": "Follow for practical lessons...",
  "newsletterUrl": "",                      // empty omits the subscribe line
  "newsletterLine": "One backend lesson in your inbox every week → {{NEWSLETTER_URL}}"
}
```

Relative `techIconsDir`, `figmaConfigPath`, and `outroPhoto` paths resolve against
the skill directory, so the bundled defaults work out of the box. Point them at your
own files to rebrand.

## Usage

Ask the agent, for example:

> Create a LinkedIn carousel about the top 10 Git commands

The skill infers the slide count and title style, generates the content, renders the
slides, and produces the PDF, videos, GIF, and captions in
`<outputDir>/carousel-<topic-slug>/`.

To run the render core directly:

```bash
node scripts/generate-carousel.mjs --config-file /path/to/carousel-config.json
```

## Output

Each run writes to `<outputDir>/carousel-<topic-slug>/`:

- `00-cover.png`, `01-...png` … `NN-outro.png` — the slides
- `carousel.pdf` — combined document for LinkedIn upload
- `carousel-desolate.mp4`, `carousel-else-paris.mp4` — beat-synced videos
- `carousel-silent.mp4`, `carousel.gif` — silent reel and GIF
- `linkedin-post.txt`, `youtube-post.txt`, `instagram-post.txt` — captions

## Pairs with linkedin-poster

Generate a carousel here, then publish or schedule it with the
[`linkedin-poster`](../linkedin-poster) skill, which uploads `carousel.pdf` as a
LinkedIn document post.

## License

MIT. See [LICENSE](./LICENSE).
