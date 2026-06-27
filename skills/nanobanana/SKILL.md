---
name: nanobanana
description: "Generate and edit images using Google's Gemini 3.1 Flash Image Preview model via the @google/genai SDK. Use this skill whenever the user wants to generate an image from a text prompt, edit/transform an existing image, create visual content, or mentions 'nanobanana', 'generate image', 'create image', 'make me an image', 'edit this image', 'image generation', or any request that involves producing or modifying images with AI. Even if the user just describes something visual they want created — a logo, illustration, diagram mockup, photo edit — this skill applies. For branded HOW-X-WORKS diagrams use the infographic skill; for carousels use the carousel skill."
---

# nanobanana — AI Image Generation & Editing

Generate and edit images using Google's Gemini `gemini-3.1-flash-image-preview`
model via the `@google/genai` SDK.

Paths below are written relative to the skill's own directory (the folder containing
this `SKILL.md`), referred to as `SKILL_DIR`. Run commands from there, or substitute
the absolute install path.

## Prerequisites

- **Node.js** with `npx` available (`tsx` runs the scripts).
- A **`GEMINI_API_KEY`** (from https://aistudio.google.com/apikey). Export it in your
  shell, or copy `SKILL_DIR/scripts/.env.example` to `SKILL_DIR/scripts/.env` and add
  it there.
- Install dependencies once:

```bash
cd SKILL_DIR/scripts && npm install
```

## Step 0: Load configuration

Read `~/amigoscode-skills/nanobanana-config.json` (expand `~`).

- **If it exists**, load and use its values.
- **If it does NOT exist** (first run), DO NOT silently copy the defaults. **Use the
  Ask tool to capture the user's preferences before creating the config** (see below).

**First-run onboarding (required — never skip the Ask).** When the central config is
missing:

1. **API key.** If `GEMINI_API_KEY` is not set in the environment and
   `SKILL_DIR/scripts/.env` does not already contain a real key, use the Ask tool to
   request the user's `GEMINI_API_KEY`, then write it to `SKILL_DIR/scripts/.env` as
   `GEMINI_API_KEY=<value>`. Never echo the key back or commit it.
2. **Preferences.** Load `SKILL_DIR/config.default.json` as the starting point, then
   use the Ask tool to confirm these fields in a single batched prompt, presenting each
   bundled default as the recommended first option (accept in one click, or "Other" to
   type a value):
   - **outputDir** — where images are saved (default `~/amigoscode-skills/nanobanana`).
   - **aspectRatio** — default aspect ratio (`1:1`, `16:9`, `9:16`, `4:3`, `3:4`).
   - **imageSize** — `1K` (faster) or `2K` (higher detail).

Overlay the answers onto `config.default.json`, create the `~/amigoscode-skills/`
folder if needed, and write the result to `~/amigoscode-skills/nanobanana-config.json`.
The `model` field keeps its bundled default. Then use the config for this run.

To customize later, edit `~/amigoscode-skills/nanobanana-config.json` (no need to touch
the skill folder). Fields: `outputDir`, `model`, `imageSize`, `aspectRatio`.

Pass the config values to the scripts as flags: `--output` (under `config.outputDir`),
`--aspect` (`config.aspectRatio`), `--size` (`config.imageSize`), and `--model`
(`config.model`). The user can always override any of these for a single run.

## How It Works

Two modes: **generate** (text-to-image) and **edit** (modify existing images).

### Mode 1: Text-to-Image Generation

```bash
cd SKILL_DIR/scripts && npx tsx generate.ts \
  --prompt "A futuristic city skyline at sunset with flying cars" \
  --aspect "16:9" \
  --size "1K" \
  --output "<config.outputDir>/city-skyline.png"
```

### Mode 2: Image Editing & Reference Images

`edit.ts` supports **multiple input images**. Use `--input` once or several times.

**Single image — edit/transform:**
```bash
cd SKILL_DIR/scripts && npx tsx edit.ts \
  --input /path/to/source-image.png \
  --prompt "Remove the background and replace it with a purple-to-blue gradient" \
  --output "<config.outputDir>/edited-image.png"
```

**Single image — style reference:**
```bash
cd SKILL_DIR/scripts && npx tsx edit.ts \
  --input /path/to/style-reference.png \
  --prompt "Generate a mountain landscape in the exact artistic style of this reference" \
  --output "<config.outputDir>/styled-landscape.png"
```

**Multiple images — combine elements:**
```bash
cd SKILL_DIR/scripts && npx tsx edit.ts \
  --input /path/to/image1.png \
  --input /path/to/image2.png \
  --input /path/to/image3.png \
  --prompt "Combine the character from the first image with the background from the second, using the color palette from the third" \
  --output "<config.outputDir>/combined.png"
```

Describe what role each image plays — Gemini sees them in order (first, second,
third), so reference them that way in the prompt.

## Output Location

- **Default**: save to `<config.outputDir>/{descriptive-filename}.{ext}`. Create the
  directory if it does not exist. Use descriptive filenames based on the prompt (e.g.
  `sunset-cityscape.png`, `logo-draft-v2.png`).
- **Custom**: if the user specifies a path, save there instead.
- Always tell the user the full saved path after generation.

## CRITICAL: Never Read Image Files

**NEVER use the Read tool on image files (PNG, JPG, JPEG, WebP, GIF, etc.) during this
workflow.** Reading binary image files sends the image data to the Claude API, which
can reject certain formats/sizes with errors like "Image format image/png not
supported".

Instead:
- Only reference images by their **file paths** (strings) — never read their contents.
- Pass file paths directly to the `--input` and `--output` script arguments.
- After generation, just tell the user the saved file path — do NOT read the output.

## Workflow

1. **Understand the request**: generation or editing? What does the user want?
2. **Craft the prompt**: detailed and descriptive — style, composition, colors, mood.
   The better the prompt, the better the result.
3. **Run the script**: execute generate.ts or edit.ts with the prompt and output path.
4. **Show the result**: tell the user the full saved path. Do NOT read the image. If
   they want changes, iterate — refine the prompt or run edit mode on the output.

## Prompt Engineering Tips

Enrich user requests with detail, but respect intent (keep simple requests simple):
- Style descriptors (photorealistic, watercolor, flat illustration, 3D render).
- Lighting and mood (soft golden hour light, dramatic shadows, neon glow).
- Composition hints (close-up, wide shot, bird's eye view, centered).
- Quality markers (high detail, sharp focus, professional quality).

### Prompt Examples by Use Case

**Text-to-image** — "make me a logo for a coffee shop called Brew":
`"A minimalist logo for a coffee shop called 'Brew'. Clean vector style, a steaming coffee cup icon, modern sans-serif typography, warm brown and cream palette, professional brand identity, centered on white background"`

**Single image editing** — "remove the background from this photo":
`"Remove the background completely and replace it with a clean white background. Keep the subject sharp with clean edges"`

**Style reference** — "generate a cat portrait in the style of this painting":
`"A cat sitting regally on a velvet cushion. Match the exact artistic style, brushwork, color palette, and lighting of the reference image"`

**Content modification** — "make this photo look like sunset":
`"Transform the lighting to golden hour sunset. Warm orange and pink tones in the sky, soft golden light on the subject, long gentle shadows, warm atmospheric glow"`

**Multi-image compositing** — "put the dog from photo 1 into the beach scene from photo 2":
`"Place the dog from the first image naturally into the beach scene from the second. Match lighting, shadows, and perspective. Maintain the dog's exact appearance and proportions"`

## Configuration Defaults

The scripts default to (overridable via flags / central config):
- **Model**: `gemini-3.1-flash-image-preview`
- **Image size**: `1K` (good balance of quality and speed; `2K` for more detail)
- **Aspect ratio**: `1:1` (also `16:9`, `9:16`, `4:3`, `3:4`)
- **Response modalities**: `IMAGE` and `TEXT`
- **Thinking level**: `MINIMAL` (faster generation)

## Error Handling

- If `GEMINI_API_KEY` is not set, the script exits with a clear error — run the Step 0
  onboarding to capture it into `scripts/.env`.
- If the output directory does not exist, the script creates it before saving.
- If generation fails, share the error and suggest prompt adjustments.
