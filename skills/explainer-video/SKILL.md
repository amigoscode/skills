---
name: explainer-video
description: "Produce a branded Amigoscode vertical explainer VIDEO (1080x1920 MP4) that teaches one backend, Java, data-structures, or system-design concept in about 40s: 8 animated scenes (code panels, diagrams, flow arrows, stacked blocks, comparison tiles) in the purple-on-navy s4.codes style, an ElevenLabs voiceover, word-by-word lower-third captions, synced sound effects, chapter dots, and a logo outro, built with HyperFrames. Also writes a LinkedIn caption.txt. Use whenever the user wants an explainer video, short, reel, or animated explainer about a technical topic, e.g. 'make a video explaining Stacks in Java', 'explainer on how Docker works', 'turn X vs Y into a short', 'another one about the N+1 problem'. Triggers on: 'explainer video', 'make a video about', 'video explaining', 'short about', 'reel about', 'animated explainer'. For a static HOW-X-WORKS image use the infographic skill; for carousels use the carousel skill; to publish use the linkedin-poster skill."
---

# Explainer Video — Branded Animated Concept Videos

Turn a single technical topic into a ~40s vertical MP4: 8 animated scenes, ElevenLabs voiceover, word-by-word captions, synced SFX, and a `caption.txt`. Built on HyperFrames (HTML + GSAP, rendered via `npx hyperframes`).

**Deliverables for every run (you are NOT done until all exist in the project folder):**
1. `renders/<Topic>.mp4` — the final video (audio + captions + SFX)
2. `caption.txt` — the LinkedIn caption (Step 9)
3. `transcript.json` — word-level transcript

Create a todo per step so nothing is skipped.

## Prerequisites

- **ELEVEN_LABS** API key (Creator tier or above for professional/cloned voices). Export it, or copy `.env.example` to `.env`.
- **ffmpeg / ffprobe** on PATH (SFX synthesis + audio conversion).
- **HyperFrames CLI** via `npx hyperframes` (used for `transcribe`, `lint`, `inspect`, `render`). Transcription uses a local Whisper model; it downloads on first run.

`SKILL_DIR` = the folder containing this `SKILL.md`. Paths below resolve against it.

## Step 0 — Load config

Read `~/amigoscode-skills/explainer-video-config.json` (expand `~`). If missing, create `~/amigoscode-skills/` and copy `SKILL_DIR/config.default.json` there, then use it. Bundled defaults are working Amigoscode values. Fields: `logoPath`, `fontPath`, `designPath`, `outputDir`, `width/height/fps`, `scenePad`, `sceneCrossfade`, `voiceId`, `voiceModel`, `voiceSettings`, `sfxVolumes`, `ctaLine`.

To change the voice, edit `voiceId` (and `voiceSettings`: lower `stability` = livelier, higher `style` = more expressive). Read `assets/design.md` — it is the brand source of truth (palette, fonts). Never invent colors.

## Step 1 — Plan the 8 scenes + narration

Decompose the topic into a tight narrative arc. The proven 8-beat structure:

1. **The problem / what it is** — the hook
2. **The core idea / one rule**
3. **Mechanism A** (e.g. a code panel + the first operation)
4. **Mechanism B** (the second operation / a twist)
5. **The payoff demo** (the longest, most animated scene)
6. **In practice** (the API / real syntax)
7. **Where it's used** (quick chips) — short scene
8. **Outro** — logo + one-line recap

Write one narration line per scene (15-22 words for scenes 1-6, ~10 for 7, ~7 for 8). Plain spoken English, one idea per line. A few `!` add energy. This is the script the viewer hears AND roughly what the captions show.

## Step 2 — Scaffold the project

```
<outputDir>/<Topic>/
├── index.html            ← from SKILL_DIR/assets/composition-template.html
├── config.json           ← the resolved Step 0 config
├── captions-data.js      ← start with: window.CAPTION_WORDS = [];
├── assets/logo-mark.svg  ← from config.logoPath
├── fonts/Epilogue.woff2  ← from config.fontPath
├── sfx/                  ← generated in Step 6
├── vo/                   ← lines.tsv + generated audio
│   ├── lines.tsv
│   ├── gen-vo.mjs        ← copy from SKILL_DIR/assets
│   └── merge-transcript.mjs (copy), patch-time.mjs (copy to project root)
└── renders/
```

Copy `composition-template.html` → `index.html`, the helper scripts, `logo-mark.svg`, `Epilogue.woff2`. Write `captions-data.js` as an empty array so the page loads before VO exists.

## Step 3 — Author the 8 scenes (the creative part)

Edit `index.html`. For each scene `sN`:
- Set the `KICKER` text and headline.
- Fill the `<!-- SCENE N CONTENT -->` slot with the visual (absolute-positioned at 1080x1920). Reuse the **component library** in the template (`.sblock` stacked blocks with `mkBlock(...)`, `.method` pills, `.usechip` rows, `.card` code panels, the `arrow(...)` self-drawing-arrow helper) or build bespoke SVG/divs in the brand palette.
- Add the per-scene entrance beats under `// SCENE N BEATS` using `gsap.from(...)` at `sN + offset` times. **Entrances only** — the crossfade between scenes is the exit (never animate elements out except the final scene). Vary eases. Signature motions land mid-scene (a block pushing on, an arrow drawing, a value popping).
- Set the chapter label `data-i="N-1"` text and confirm `darkCh` matches each scene's background.

Study `SKILL_DIR/assets/example-stacks.html` — a complete worked composition (Stacks in Java). Match its density and rhythm. Backgrounds follow the fixed brand rhythm already in the template (dark, light, white, dark, white, light, dark, deepest).

## Step 4 — Write the voiceover script file

`vo/lines.tsv` — one row per scene, tab-separated: `id<TAB>start<TAB>text`. Put placeholder `0` for start (patch-time overwrites it). Example row:
`s3	0	Push adds an element to the top. Push ten, then twenty, then thirty! The stack grows upward.`

## Step 5 — Generate the voiceover

```bash
cd <project> && ELEVEN_LABS=$KEY node vo/gen-vo.mjs
```
Reads `config.json` (voice) + `vo/lines.tsv`; writes `vo/sN.mp3`, `vo/sN.wav`, and `vo/durs.json`.

## Step 6 — Define SFX + synthesize the kit

Generate the premium SFX kit once: `bash assets/gen-sfx.sh` from the project (writes `sfx/{pop,whoosh,tick,chime,boom}.wav`). Then write `vo/sfx-events.json` — sounds synced to your animation beats:
```json
[
  {"sfx":"pop","scene":"s3","at":2.0},
  {"sfx":"whoosh","scene":"s4","at":2.4,"vol":0.5},
  {"sfx":"tick","scene":"s6","at":1.0},
  {"sfx":"boom","scene":"s8","at":0},
  {"sfx":"chime","scene":"s8","at":0}
]
```
`at` is the offset from the scene's start (use the same offsets as your GSAP beats). Transition whooshes at each scene cut are added automatically. Volumes default from `config.sfxVolumes`; the outro boom is intentionally quiet (0.18). Pops auto-alternate across two tracks so close ones ring out.

## Step 7 — Re-fit the timeline

```bash
cd <project> && node patch-time.mjs
```
Reads `vo/durs.json` + `vo/sfx-events.json` and rewrites every scene/audio/const/chapter/overlay time + the SFX block so each scene is exactly as long as its narration (tight, no dead air), with 0.4s crossfades. **Always run this after regenerating VO** — it is the single source of timing truth.

## Step 8 — Transcribe + captions, then lint/render

```bash
cd <project>
for id in s1 s2 s3 s4 s5 s6 s7 s8; do
  npx --yes hyperframes transcribe "vo/$id.wav" --model small.en
  cp vo/transcript.json "vo/$id.json"
done
node vo/merge-transcript.mjs              # -> transcript.json + captions-data.js
npx --yes hyperframes lint                # fix all errors
npx --yes hyperframes inspect --at <mid-scene timestamps>   # 0 layout issues; ignore flags that land inside a crossfade
npx --yes hyperframes render --quality high --fps 30 --output "renders/<Topic>.mp4"
```
Use `--model small.en` only for English audio. Inspect at mid-scene times (avoid the ±0.4s crossfade windows, which show the outgoing scene behind the incoming one — that is expected, not a bug).

## Step 9 — Write caption.txt

Write `caption.txt` following `SKILL_DIR/assets/caption-examples.md` exactly: a strong hook, reframe into a mental model, `→` bullets (no blank lines between them), the junior-mistake / senior-reframe contrast, one engaging question, then the `ctaLine`. Plain text, no markdown, no emojis, no em or en dashes. Hashtags are NOT in the body.

## Iterating (fast paths)

- **Change the voice**: edit `voiceId`/`voiceSettings` in config → rerun Steps 5, 7, 8. Everything re-fits automatically.
- **Too long / dead air**: scenes already fit the VO. If one scene holds after its animation, spread that scene's beats later or shorten its narration line, then rerun 5+7.
- **A sound is too loud**: edit its `vol` in `vo/sfx-events.json` (or `config.sfxVolumes`) → rerun Step 7, re-render.
- **Tighter cuts**: lower `sceneCrossfade` in config.

## Hard rules

- HTML is the source of truth; GSAP only animates visual props; timelines are `{paused:true}` and registered on `window.__timelines["main"]`. No `Math.random()`/`Date.now()`/`repeat:-1`. Every timed element has `class="clip"` + `data-start/data-duration/data-track-index`.
- Do not rename the template conventions (`sN`, `voN`, `const sN`, `CH_T`, the `SFX_START/END` markers, the caption clamp) — `patch-time.mjs` edits them by pattern.
