---
name: carousel
description: "Generate branded LinkedIn carousel slides (1080x1350px PNGs), a combined PDF, beat-synced MP4s, a GIF, and platform captions for any tech topic. Use this skill when the user wants to create a LinkedIn carousel, generate carousel slides about a technology, make LinkedIn slides or posts about programming concepts, or build a carousel post for social media. Triggers on: 'carousel', 'linkedin carousel', 'create slides', 'generate carousel', 'make a carousel about', 'carousel for', 'linkedin slides', 'pull figma', 'fetch figma', 'sync figma', 'update templates'. For publishing the resulting carousel.pdf to LinkedIn, see the linkedin-poster skill."
---

# LinkedIn Carousel Generator

Generate branded 1080x1350px LinkedIn carousel PNGs for any tech topic, plus a
combined PDF, beat-synced MP4s, a GIF, and ready-to-post captions.

Branding and paths are configurable in `~/amigoscode-skills/carousel-config.json`.
See **Step 0**. Bundled defaults work out of the box.

Paths below are written relative to the skill's own directory (the folder
containing this `SKILL.md`), referred to as `SKILL_DIR`. Run commands from there,
or substitute the absolute install path.

## Prerequisites

- Node.js with `npx` available (Playwright drives the screenshots).
- Python 3 with `librosa` available for the beat-synced MP4 step, plus `ffmpeg`
  on the PATH. ImageMagick (`convert`) or the `img2pdf` package for the PDF.
- Install dependencies and Chromium once:

```bash
cd SKILL_DIR/scripts && npm install && npx playwright install chromium
```

## Step 0: Load configuration

Read `~/amigoscode-skills/carousel-config.json` (expand `~`).

- **If it exists**, load and use its values.
- **If it does NOT exist** (first run), DO NOT silently copy the defaults. **Use the
  Ask tool to capture the user's branding before creating the config** (see below).

**First-run onboarding (required — never skip the Ask).** When the central config is
missing, load `SKILL_DIR/config.default.json` as the starting point, then use the Ask
tool to confirm the user-specific branding fields. Ask these in a single batched
prompt, presenting each bundled default as the recommended first option so the user
can accept it in one click or choose "Other" to type their own value:

1. **footerText** — website/footer text on the slides (default `www.amigoscode.com`).
2. **outroPhoto** — presenter photo path on the outro slide (default the bundled photo;
   offer "None" to drop it).
3. **outroCta** — closing line on the outro slide (default `Like and Follow for more...`).
4. **ctaLine** — the LinkedIn caption sign-off (default the bundled Amigoscode line).

Start from `config.default.json`, overlay the user's answers, create the
`~/amigoscode-skills/` folder if needed, and write the result to
`~/amigoscode-skills/carousel-config.json`. The remaining fields (theme colors,
`techIconsDir`, `logoPath`, `outroLogoPath`, newsletter line, etc.) keep their bundled
defaults; tell the user they can edit the file later to change any of them. Then use
the config for this run.

To customize later, edit `~/amigoscode-skills/carousel-config.json` (no need to touch
the skill folder). Fields:

**Paths.** `outputDir`, `techIconsDir`, and `figmaConfigPath`:

1. **outputDir**: where carousels are saved. Default: `~/amigoscode-skills/carousel`.
2. **techIconsDir**: directory of tech icon SVGs. Default: `assets/tech_icons`
   (430 icons bundled with the skill). A relative path is resolved against
   `SKILL_DIR`.
3. **figmaConfigPath**: path to the Figma template config. Default:
   `assets/figma-config.json` (bundled).

**Theme (slide colors).**

3a. **theme**: an object of brand colors used across every slide. Defaults
    reproduce the standard Amigoscode purple-on-black look:
    - `background` — gradient top (near-black). Default `#030303`.
    - `accent` — gradient bottom plus UI accents (prompt `$`, page-number
      watermark). Default `#9a53ff`.
    - `accentLight` — the command-name highlight. Default `#c4b5fd`.
    - `glow` — the radial glow behind the cover and outro. Default `#7D2AE8`.
    The code-syntax token colors are fixed (One Dark Pro) and not themed.

**Brand (shown on the slides).** The brand files live in the skill's own `assets/`
folder so they are easy to find and swap in place. Replace those files, or point
the fields below at files anywhere else:

4. **footerText**: bottom-left footer/website text on the cover and content
   slides (e.g. `www.amigoscode.com`).
5. **logoPath**: the round brand logo (top-left of cover/content slides). Default:
   `assets/logo.svg` (bundled).
6. **outroPhoto**: presenter photo at the bottom of the outro slide. Default:
   `assets/outro-photo.png`.
7. **outroLogoPath**: the wordmark logo at the top of the outro slide. Default:
   `assets/outro-logo.svg`.
8. **outroCta**: the closing line on the outro slide (e.g. `Like and Follow for
   more...`).

**Caption (text post, not on the slides).**

9. **ctaLine**: closing call-to-action line appended to the LinkedIn caption.
10. **newsletterUrl** / **newsletterLine**: optional newsletter subscribe line. If
    `newsletterUrl` is empty, the subscribe line is omitted.

Relative asset paths (`techIconsDir`, `figmaConfigPath`, `logoPath`, `outroPhoto`,
`outroLogoPath`) are resolved against `SKILL_DIR`; expand a leading `~` to the home
directory.

Every config-driven element is optional: if its `config.json` field is missing or
empty, omit that element from the slide (the generator drops the logo, photo,
footer, or CTA rather than emitting an empty value). Brand assets also fall back to
the bundled `assets/` copies if a configured path does not exist.

## Figma Template Sync (optional)

Template source designs are tracked in the file named by `config.figmaConfigPath`.
It contains the Figma file key and node IDs for the 3 slide templates (cover,
content, outro).

When the user asks to pull/fetch/sync Figma templates:

1. Read the `figmaConfigPath` file to get the Figma file key and node IDs.
2. Use `get_design_context` from the Figma MCP server for each template.
3. Compare the returned design against the current HTML templates in
   `SKILL_DIR/templates/slides/`.
4. Update the CSS and HTML templates to match any design changes.
5. Update `lastUpdated` in the config JSON.
6. If assets need updating, download and save to `SKILL_DIR/assets/`.

## Pipeline

1. Parse user request -> extract topic, slide count, title style.
2. Generate all slide content (cover title + per-slide title/description).
3. Match topic to a tech icon SVG from `config.techIconsDir`.
4. Write config JSON to a temp file.
5. Run `node SKILL_DIR/scripts/generate-carousel.mjs --config-file <path>`.
6. Generate PDF, MP4s, GIF, and captions; report output to the user.

## Workflow

### Step 1: Parse the Request

Extract from the user's message:
- **Topic**: e.g., "10 most used Git commands", "top 5 React hooks".
- **Slide count**: infer from the topic (e.g., "top 10" = 10 slides). Default to 10.
- **Title style**: "command" for CLI tools (git, docker, npm, kubectl), "tokens"
  for code/queries with syntax highlighting (SQL, code snippets), "text" for plain
  concepts (hooks, patterns, features).

### Step 2: Generate Content

Generate a JSON config object. For each content slide provide:
- **title**: one of three modes:
  - Command mode: `{ "prompt": "$", "cmd": "git", "arg": "init" }`
  - Token mode (Shiki-style): `{ "tokens": [{ "type": "keyword", "text": "SELECT" }, { "type": "plain", "text": " * " }, { "type": "keyword", "text": "FROM" }] }`
  - Text mode: `{ "text": "useState" }`
- **description**: 2-3 sentences, 40-60 words max. Educational and concise.
- **iconSvg** (optional): inline SVG for a per-slide icon. Add this when each slide
  represents a different technology/tool/language. See Step 3.

**IMPORTANT: Always prefer token mode over text mode when the title contains code,
queries, or commands.** Token mode produces Shiki-style syntax highlighting. Only
fall back to text mode for plain concepts with no code syntax.

Also generate:
- **coverTitle**: main title with `<br>` for line breaks. ~10-12 uppercase chars
  per line max.

### Step 3: Match Tech Icons

Use the directory from `config.techIconsDir` (default `SKILL_DIR/assets/tech_icons`).

#### Cover icon
Find an SVG for the overall topic:

```bash
ls "<techIconsDir>" | grep -i "<keyword>"
```

Icons use Title Case: `Git.svg`, `React.svg`, `Docker.svg`, `JavaScript.svg`, etc.

#### Per-slide icons (always do this when applicable)
**When each slide represents a distinct technology, tool, language, or product, add
a per-slide `iconSvg` for every content slide.** This makes the carousel
significantly more visual.

Add per-slide icons for: "Top 10 programming languages", "AI tools for developers",
"Best databases in 2026", "Frontend frameworks compared".

Do NOT add per-slide icons when all slides share one topic: "10 Git commands",
"SQL queries explained", "Docker commands" (use the cover icon only).

#### Fallback: download from techicons.dev
If an icon is NOT found locally, download it into `config.techIconsDir`:

```bash
curl -sL "https://icon.icepanel.io/Technology/svg/<Name>.svg" -o "<techIconsDir>/<Name>.svg"
```

Naming is Title Case with hyphens: `GitHub-Copilot.svg`, `ChatGPT.svg`, etc. If
unsure of the exact name, WebFetch `https://techicons.dev/icons/<name>` to find the
CDN URL. Always save downloaded icons into `config.techIconsDir` so they cache for
future use.

Read the matched SVG file content for embedding in the config.

### Step 4: Write Config and Run

Write a JSON config file to a temp path (e.g. `SKILL_DIR/output/carousel-config.json`):

```json
{
  "coverTitle": "10 Most Used<br>Git Commands",
  "techIconSvg": "<svg>...contents of Git.svg...</svg>",
  "contentSlides": [
    {
      "title": { "prompt": "$", "cmd": "git", "arg": "init" },
      "description": "Initializes a new Git repository in your current directory.",
      "iconSvg": "<svg>...optional per-slide icon...</svg>"
    }
  ],
  "outputDir": "<config.outputDir>/carousel-<topic-slug>/",
  "assetsDir": "SKILL_DIR/assets",
  "footerText": "<config.footerText>",
  "logoPath": "<config.logoPath, ~ and relative paths resolved to absolute>",
  "outroLogoPath": "<config.outroLogoPath, resolved to absolute>",
  "outroPhoto": "<config.outroPhoto, resolved to absolute>",
  "outroCta": "<config.outroCta>",
  "theme": "<config.theme object, copied verbatim>"
}
```

**Copy the brand fields straight from `config.json`** into the render config:
`footerText`, `logoPath`, `outroLogoPath`, `outroPhoto`, `outroCta`, and the whole
`theme` object. Resolve each asset path to absolute first (expand a leading `~`;
resolve a relative path against `SKILL_DIR`). The generator falls back to the
bundled `assets/` copy if a path does not exist, omits any element whose value is
empty, and falls back to the default palette for any missing `theme` color.

`assetsDir` stays pointed at the bundled `SKILL_DIR/assets` (it provides the swipe
icon, arrow, and the fallback brand files). The configured `logoPath` /
`outroLogoPath` / `outroPhoto` take precedence over the bundled copies.

If you build the config with embedded icons via `build-config.py`, set the icons
directory first so it reads from the configured location:

```bash
export CAROUSEL_ICONS_DIR="<techIconsDir>"
python3 SKILL_DIR/scripts/build-config.py <output-path> < simplified-config.json
```

Then run:

```bash
node SKILL_DIR/scripts/generate-carousel.mjs --config-file <output-path>
```

### Step 5: Generate Captions

After generating the PNGs, ALWAYS create 3 caption files in the output directory:

1. **`linkedin-post.txt`** — LinkedIn caption with LinkedIn hashtags
2. **`youtube-post.txt`** — YouTube description with YouTube hashtags
3. **`instagram-post.txt`** — Instagram caption with Instagram hashtags

Use this system prompt for ALL caption writing:

```
You are a senior software engineer working at Amigoscode.

You deeply understand backend engineering, Java, Spring Boot, Spring Security, system design, and real world production systems.

You are exceptional at explaining complex technical systems so beginners can understand them clearly.

You are also an expert LinkedIn content creator for the software engineering niche.

Your job is to transform technical infographics or diagrams into educational LinkedIn posts that simplify complex systems and build strong engineering intuition.

Follow these rules strictly:

Do NOT describe the image or infographic.
Do NOT repeat the text from the image.
Go straight into explaining the core concept behind the system.
Start with a strong insight or pain point developers experience when dealing with this topic.
Explain the system using a clear mental model instead of definitions.
Break the concept down step by step in a simple way.
Use bullet points with this symbol only:
→
Do NOT add line breaks between bullet points.
Focus on helping beginners understand how things actually work in practice.
Highlight common mistakes developers make when working with this system.
Show how senior engineers think differently about the same concept.
Keep language simple, clear, and practical.
Avoid jargon unless you explain it simply.
Ask engaging questions at the end to encourage comments and discussion.
Always finish with a soft call to action encouraging readers to follow Amigoscode for software engineering insights.

Output rules:
Plain text only
No markdown
No bold text
No emojis
No special characters
No em dashes or en dashes

Tone:
Senior engineer mentor
Clear
Practical
Insight driven
Beginner friendly but not simplistic
```

Read `SKILL_DIR/../infographic/assets/caption-examples.md` (the sibling infographic
skill) for full reference examples demonstrating the exact voice and arrow
grouping. Match those examples. If that file is not present, follow the inline
system prompt above.

**Branding lines (from `config.json`, do not prompt every run):**
- End the LinkedIn caption with `config.ctaLine` verbatim as the final line.
- If `config.newsletterUrl` is non-empty, add the subscribe line just before the
  CTA: take `config.newsletterLine` and replace `{{NEWSLETTER_URL}}` with
  `config.newsletterUrl`. Use the `→` symbol. If `newsletterUrl` is empty, omit it.

Hashtag guidelines:
- **LinkedIn**: 3-5 hashtags (e.g., #SoftwareEngineering #Java #Programming).
- **YouTube**: 5-8 hashtags.
- **Instagram**: 15-20 hashtags (mix of broad + niche).

Write each caption file with the Write tool directly to the output directory.

### Step 6: Generate PDF

LinkedIn carousels upload as PDF documents. **Always produce `carousel.pdf` — never
skip it.** Use ImageMagick if present; otherwise fall back to `img2pdf`, installing
it with `pip` (no sudo or system package manager needed):

```bash
if command -v convert >/dev/null 2>&1 || command -v magick >/dev/null 2>&1; then
  CONV=$(command -v magick || command -v convert)
  "$CONV" <outputDir>/0*.png <outputDir>/1*.png <outputDir>/carousel.pdf
else
  python3 -c "import img2pdf" 2>/dev/null || pip3 install img2pdf || pip install img2pdf
  python3 -c "
import img2pdf, glob, os
imgs = sorted(glob.glob(os.path.join('<outputDir>', '*.png')))
with open(os.path.join('<outputDir>', 'carousel.pdf'), 'wb') as f:
    f.write(img2pdf.convert(imgs))
"
fi
```

`img2pdf` is the reliable fallback because it installs from PyPI without root. Only
report the PDF as skipped if even `pip install img2pdf` fails.

### Step 7: Generate Beat-Synced MP4s and GIF

Generate MP4 videos where slides change on bass hits. One MP4 per audio track,
plus a GIF. Audio tracks live in `SKILL_DIR/audio/`:
- `desolate-slowed.m4a` — bass hits start ~25s, ~1.4s intervals.
- `else-paris.m4a` — tighter rhythm, bass hits start ~37s.

**Ensure `ffmpeg` first (install it if missing — do not skip the videos).** The
MP4 and GIF outputs need `ffmpeg`. If it is not on the PATH, install it with the
platform's package manager, then continue:

```bash
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg not found — installing..."
  if command -v brew >/dev/null 2>&1; then brew install ffmpeg
  elif command -v apt-get >/dev/null 2>&1; then sudo apt-get update && sudo apt-get install -y ffmpeg
  elif command -v dnf >/dev/null 2>&1; then sudo dnf install -y ffmpeg
  elif command -v yum >/dev/null 2>&1; then sudo yum install -y epel-release && sudo yum install -y ffmpeg
  elif command -v pacman >/dev/null 2>&1; then sudo pacman -S --noconfirm ffmpeg
  elif command -v apk >/dev/null 2>&1; then sudo apk add ffmpeg
  else echo "No known package manager — install ffmpeg manually."; fi
fi
command -v ffmpeg >/dev/null 2>&1 && echo "ffmpeg ready" || echo "ffmpeg still missing — video/GIF steps will be skipped"
```

Only skip the MP4/GIF outputs if `ffmpeg` still cannot be installed (e.g. no
package manager or no sudo). The beat-synced MP4s additionally need Python
`librosa`; if it is missing, install it with `pip install librosa` or skip just the
beat-synced pair while still producing the silent MP4 and GIF. If the audio files
are absent, skip only the beat-synced MP4s.

```bash
python3 SKILL_DIR/scripts/beat-sync-video.py \
  --slides-dir <outputDir> \
  --audio SKILL_DIR/audio/desolate-slowed.m4a \
  --output <outputDir>/carousel-desolate.mp4

python3 SKILL_DIR/scripts/beat-sync-video.py \
  --slides-dir <outputDir> \
  --audio SKILL_DIR/audio/else-paris.m4a \
  --output <outputDir>/carousel-else-paris.mp4
```

**Silent MP4 (1 second per slide):**

```bash
python3 -c "
import os, glob
d = '<outputDir>'
pngs = sorted(glob.glob(os.path.join(d, '*.png')))
with open('SKILL_DIR/output/ffmpeg-input.txt', 'w') as f:
    for p in pngs:
        f.write(f\"file '{p}'\n\")
        f.write('duration 1\n')
    f.write(f\"file '{pngs[-1]}'\n\")
"
ffmpeg -y -f concat -safe 0 -i SKILL_DIR/output/ffmpeg-input.txt -vf "scale=1080:1350" -c:v libx264 -pix_fmt yuv420p -r 30 <outputDir>/carousel-silent.mp4
```

**GIF (1 second per slide):**

```bash
ffmpeg -y -f concat -safe 0 -i SKILL_DIR/output/ffmpeg-input.txt -vf "scale=540:675" -loop 0 <outputDir>/carousel.gif
```

### Step 8: Report Results

Tell the user:
- Number of slides generated (cover + N content + outro).
- Output directory path.
- The output files: PNGs, carousel.pdf, carousel-desolate.mp4, carousel-else-paris.mp4,
  carousel-silent.mp4, carousel.gif, and the 3 caption .txt files.
- Suggest they review the slides and captions.

## Title Format Reference

Each content slide's `title` supports **command mode** (`{ prompt, cmd, arg }`),
**token mode** (`{ tokens: [{ type, text }] }`, Shiki-style syntax highlighting —
PREFER this for any code/queries/commands), and **text mode** (`{ text }`). Slides
can also use **comparison mode** (`type: "comparison"`) for BAD vs GOOD code.

**Read [`references/title-formats.md`](references/title-formats.md)** for the full
token-type color table and worked JSON examples (SQL, CLI, JavaScript, comparison).
## Content Guidelines

- Descriptions: educational, LinkedIn-appropriate, 40-60 words.
- Each description explains WHAT the item does and WHY it matters.
- Write in normal case (CSS applies uppercase automatically).
- Keep it accessible for junior to mid-level developers.

## Cover Title Guidelines

- Use `<br>` for line breaks; ~10-12 uppercase chars per line (font is 85px in an
  880px container).
- **The cover title is the HOOK — it must stop the scroll.** Use bold,
  curiosity-driven, or slightly controversial phrasing.
  - BAD: `Git Commands<br>To Know` → GOOD: `10 Git Commands<br>You're Not Using`
  - BAD: `SQL Queries<br>Overview` → GOOD: `SQL Queries Every<br>Dev Must Know`
  - BAD: `Programming<br>Languages` → GOOD: `Stop Ignoring<br>These Languages`
- Techniques: curiosity gap, urgency ("Must-Know"), specific numbers, contrarian
  takes, FOMO ("...Before Your Next Interview").

## Example

User: "Create a LinkedIn carousel about the top 5 Docker commands"

1. Topic: Docker commands, 5 slides, command mode.
2. Icon: read `<techIconsDir>/Docker.svg`.
3. Cover title: `Top 5<br>Docker Commands`.
4. Content slides: `$ docker build`, `$ docker run`, `$ docker ps`, `$ docker pull`,
   `$ docker compose up` — each with a 40-60 word description.
5. Output: 7 PNGs (cover + 5 content + outro) to
   `<config.outputDir>/carousel-docker-commands/`, plus PDF, MP4s, GIF, and captions.
