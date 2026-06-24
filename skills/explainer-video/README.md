# explainer-video

Generate branded **Amigoscode vertical explainer videos** (1080x1920 MP4) that teach one
technical concept in ~40 seconds. Eight animated scenes on the purple-on-navy brand, an
ElevenLabs voiceover, word-by-word lower-third captions, synced sound effects, chapter dots,
a logo outro, plus a ready-to-post LinkedIn `caption.txt`.

Built on [HyperFrames](https://hyperframes.heygen.com) (HTML + GSAP), rendered locally.

## What you get per run

```
<outputDir>/<Topic>/
├── renders/<Topic>.mp4   ← final video (voiceover + captions + SFX)
├── caption.txt           ← LinkedIn caption (senior-mentor pattern)
├── transcript.json       ← word-level transcript
├── index.html            ← the HyperFrames composition
├── vo/                   ← narration script + audio + per-scene transcripts
└── sfx/                  ← synthesized sound kit (pop / whoosh / tick / chime / boom)
```

## Prerequisites

- `ELEVEN_LABS` API key — Creator tier or above for professional/cloned voices ([elevenlabs.io](https://elevenlabs.io)).
- `ffmpeg` and `ffprobe` on PATH.
- Node.js with `npx` (the HyperFrames CLI runs via `npx hyperframes`; Whisper transcription downloads its model on first run).

```bash
cp .env.example .env   # then add your key, or: export ELEVEN_LABS=...
```

## Usage

In Claude Code:

> "Create an explainer video about how HashMaps work"
> "Make a short explaining the N+1 query problem"
> "Another one about virtual threads"

The skill plans 8 scenes, authors the composition, generates the voiceover, syncs captions and
sound effects, renders the MP4, and writes the caption. See `SKILL.md` for the full workflow.

## Configuration

First run copies `config.default.json` to `~/amigoscode-skills/explainer-video-config.json`.
Edit it to change the voice (`voiceId`, `voiceSettings`), logo (`logoPath`), output location,
sound-effect volumes, pacing (`scenePad`, `sceneCrossfade`), or the caption CTA. Brand palette
and fonts live in `assets/design.md`.

## Assets

- `assets/composition-template.html` — composition skeleton (helpers, caption + chapter builders, SFX wiring).
- `assets/example-stacks.html` — a complete worked example ("Stacks in Java") to match for density and rhythm.
- `assets/gen-vo.mjs`, `patch-time.mjs`, `merge-transcript.mjs`, `gen-sfx.sh` — the pipeline.
- `assets/logo-mark.svg`, `Epilogue.woff2`, `design.md`, `caption-examples.md` — brand.

## License

MIT
