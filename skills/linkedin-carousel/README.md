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

  // Theme — slide colors (defaults reproduce the purple-on-black look)
  "theme": {
    "background": "#030303",   // gradient top
    "accent": "#9a53ff",       // gradient bottom + prompt/page-number accents
    "accentLight": "#c4b5fd",  // command-name highlight
    "glow": "#7D2AE8"          // radial glow behind cover/outro
  },

  // Brand (shown on the slides) — swap without touching the skill
  "footerText": "www.yourdomain.com",      // bottom-left footer on cover/content slides
  "logoPath": "assets/logo.svg",           // round logo, top-left of cover/content slides
  "outroPhoto": "assets/outro-photo.png",  // presenter photo at the bottom of the outro
  "outroLogoPath": "assets/outro-logo.svg",// wordmark at the top of the outro
  "outroCta": "Like and Follow for more...", // closing line on the outro slide

  // Caption (text post, not on the slides)
  "ctaLine": "Follow for practical lessons...",
  "newsletterUrl": "",                      // empty omits the subscribe line
  "newsletterLine": "One backend lesson in your inbox every week → {{NEWSLETTER_URL}}"
}
```

The brand files live in the skill's own `assets/` folder so they are easy to find
and change:

- `assets/logo.svg` — round logo, top-left of cover/content slides
- `assets/outro-logo.svg` — wordmark at the top of the outro
- `assets/outro-photo.png` — presenter photo at the bottom of the outro

To rebrand, just replace those files in place (keep the same names), or point the
`logoPath` / `outroLogoPath` / `outroPhoto` fields at files anywhere else (absolute
or `~`-prefixed). Relative paths resolve against the skill directory. Every brand
element is optional: leave a field empty to drop it from the slide (no logo, no
footer, no photo, no outro CTA), and any path that does not exist falls back to the
bundled copy.

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
