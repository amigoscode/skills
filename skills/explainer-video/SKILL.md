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

- **Voice engine** (Step 0 picks one): either an **ELEVEN_LABS** API key (Creator tier or above for professional/cloned voices; export it or copy `.env.example` to `.env`) — OR the **free local Kokoro** engine, which needs no key (Python with `kokoro-onnx`/`soundfile`; model downloads on first run).
- **ffmpeg / ffprobe** on PATH (SFX synthesis + audio conversion).
- **HyperFrames CLI** via `npx hyperframes` (used for `transcribe`, `lint`, `inspect`, `render`). Transcription uses a local Whisper model; it downloads on first run.

`SKILL_DIR` = the folder containing this `SKILL.md`. Paths below resolve against it.

## Step 0 — Load config

Read `~/amigoscode-skills/explainer-video-config.json` (expand `~`). If it exists, use its values. **If it is missing (first run), DO NOT silently copy the defaults** — load `SKILL_DIR/config.default.json` as the starting point, then use the Ask tool to confirm the user-specific fields in a single batched prompt, presenting each bundled default as the recommended first option (accept in one click, or choose "Other" to type a value): **1. ctaLine** (caption/outro sign-off, default the bundled Amigoscode line); **2. logoPath** (outro logo, default the bundled asset; offer "None" to drop it); **3. voiceId** (which `config.voices` entry to use, default the bundled voice). Overlay the answers onto `config.default.json`, create `~/amigoscode-skills/` if needed, write `~/amigoscode-skills/explainer-video-config.json`, and use it; the rest keep their bundled defaults (editable later). Fields: `logoPath`, `fontPath`, `designPath`, `outputDir`, `width/height/fps`, `scenePad`, `sceneCrossfade`, `voiceId`, `voiceModel`, `voiceSettings`, `sfxVolumes`, `ctaLine`.

**Choosing the voice.** `config.voices` maps a `name` to a voice. Each entry is either a raw ElevenLabs id (string) or `{ "provider": "...", "id": "..." }`. `config.voiceId` selects one by name (or set it to a raw id directly). Two engines:

- **`elevenlabs`** (default) — paid, needs the `ELEVEN_LABS` key. High quality, expressive.
- **`kokoro`** — **free, local, no API key** (runs via `npx hyperframes tts`). The bundled `free` (`am_adam`) and `free-uk` (`bm_george`) voices use it. First run downloads the model; needs Python with `kokoro-onnx`/`soundfile` (see the `hyperframes-media` skill). Voice ids are Kokoro names like `am_adam`, `bf_emma`, `af_heart` — list them with `npx hyperframes tts --list`.

To switch voices, point `voiceId` at another entry (e.g. `"free"`), or add your own. One-off override without editing config: `VOICE=free node vo/gen-vo.mjs`, or `VOICE_ID=<id> VOICE_PROVIDER=kokoro node vo/gen-vo.mjs`. Tune ElevenLabs delivery with `voiceSettings` (lower `stability` = livelier, higher `style` = more expressive). Read `assets/design.md` — it is the brand source of truth (palette, fonts). Never invent colors.

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

Write one narration line per scene. Plain spoken English, one idea per line. A few `!` add energy. This is the script the viewer hears AND roughly what the captions show.

**Hard length budget — the final video MUST be under 60 seconds (aim 45-50s).** The narration is the only thing that drives length, so keep it tight from the start:

- Scenes 1-6: **12-16 spoken words each**
- Scene 7: **~9 words**
- Scene 8: **~6 words**
- Total script: **~100-120 words**

This voice reads expressively (slowly), so wordy scripts balloon fast: ~150 words runs ~60s, ~200 words runs ~85s. One idea per scene, cut every redundant clause. Step 8 enforces the ceiling and trims if you overshoot.

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

**Nothing is ever static — every scene must be in continuous motion, the whole time it is on screen.** A diagram that animates in once and then sits still is dead air. After the entrance, *something must keep moving* until the scene cuts. The template provides two helpers for this:

- **`flow(svgId, x1,y1, x2,y2, color, at, repeat)`** — a connector whose dots march continuously toward the arrowhead, diagrams.net style. **Use it for every relationship line** (tree edges, pointers, a lookup path) instead of a static drawn arrow. A diagram of nodes should have flowing links, never dead lines.
- **`pulse(sel, at, scale, repeat)`** — breathes an element (badges, a matched row, chips, the outro logo) so it never freezes.

Beyond those: a counter ticking up, a scanner crawling row by row (flash each row as it passes), a packet looping along a path (`keyframes` + `repeat`), a blinking caret on a code panel, a highlight sweeping a list, method pills bobbing in a wave. Give **every** scene at least one motion that runs from just after its entrance to the cut. Loops use a **finite** `repeat` count (no `repeat:-1`, which is banned) sized to roughly cover the scene; the scene crossfade hides any tail. Build the duration's worth of motion, then the scene is alive end to end.

Study `SKILL_DIR/assets/example-stacks.html` — a complete worked composition (Stacks in Java). Match its density and rhythm. Backgrounds follow the fixed brand rhythm already in the template (dark, light, white, dark, white, light, dark, deepest).

## Step 4 — Write the voiceover script file

`vo/lines.tsv` — one row per scene, tab-separated: `id<TAB>start<TAB>text`. Put placeholder `0` for start (patch-time overwrites it). Example row:
`s3	0	Push adds an element to the top. Push ten, then twenty, then thirty! The stack grows upward.`

## Step 5 — Generate the voiceover

```bash
cd <project> && ELEVEN_LABS=$KEY node vo/gen-vo.mjs
```
Reads `config.json` (voice) + `vo/lines.tsv`; writes `vo/sN.mp3`, `vo/sN.wav`, and `vo/durs.json`.

## Step 6 — Sound: transition whoosh only

Copy the bundled sound so the file exists: `cp "$SKILL_DIR/assets/sfx/whoosh.wav" sfx/`. The shipped `whoosh.wav` is **synthesized and royalty-free** (regenerate it any time with `bash "$SKILL_DIR/assets/gen-sfx.sh"`). **The default sound design is one sound: the transition `whoosh` at each scene cut.** It is added automatically at every scene boundary — you do not list it. This reads clean and intentional; per-element accent sounds (ticks, pops, dings) tested noisy and busy, so they are off by default. To use a different transition sound, drop your own `whoosh.wav` into the project's `sfx/` (and make sure you have the rights to it before sharing the result).

So `vo/sfx-events.json` is just an empty array:
```json
[]
```
The transition whoosh fires at each cut via `autoTransitions` (disable with `autoTransitions:false`; volume is `config.sfxVolumes.transition`, ~0.45). If a specific video truly needs an accent on one hero beat, you *can* add `{"sfx":"whoosh","scene":"s5","at":1.9,"vol":0.3}`, but default to none — let the motion carry the energy. Drop any `.wav` into `sfx/` to reference it by name.

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

**Enforce the length ceiling (required).** After rendering, measure the real duration:
```bash
ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "renders/<Topic>.mp4"
```
If it is **60s or more (or you want it under your ~50s target)**, the narration is too long. Trim the wordiest 1-2 lines in `vo/lines.tsv` (cut clauses, not scenes), then rerun **Step 5 (gen-vo) → Step 7 (patch-time) → Step 8 (transcribe/caption/render)** and measure again. Repeat until it is under the ceiling. The voice's pace varies run to run, so a script that looks short can still overshoot — always verify the rendered file, never assume. You are not done until the mp4 is under 60s.

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
