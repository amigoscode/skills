---
name: x-card
description: "Generate a social media quote card styled like a dark-mode X (Twitter) post: profile photo, blue verified tick, name, handle, a punchy body quote, and retweet/like stats, exported as a 1080x1350 PNG plus a LinkedIn caption. Use this skill when the user wants an X card, a tweet-style image, a quote card, a 'make it look like a tweet' graphic, or a branded social post image. Triggers on: 'make an X card', 'create a tweet card', 'make it look like a tweet', 'generate a quote card', 'social card', 'x card'. For a hand-drawn HOW X WORKS diagram use the infographic skill; for multi-slide carousels use the carousel skill; to publish the result use the linkedin-poster skill."
---

# X Card Generator

Generate a 1080x1350 PNG (4:5 portrait) styled like a dark-mode X (Twitter) post:
- Full black background (no border, no rounded card)
- Circular profile photo with a blue verified tick
- Name, handle, and an auto-scaling body quote (42-72px)
- Retweet and Like stats at the bottom
- Crisp edges via 2x supersampling

Identity and branding are configurable. See **Step 0**. Paths below are relative to
the skill's own directory (the folder containing this `SKILL.md`), referred to as
`SKILL_DIR`.

## Prerequisites

- Python 3 with Pillow: `pip install pillow` (numpy is NOT required).
- The display fonts (`Outfit-Bold.ttf`, `WorkSans-Regular.ttf`) and the verified
  badge are bundled in `SKILL_DIR/assets/`. No external fonts needed.

## Step 0: Load configuration (first-run onboarding)

Read `SKILL_DIR/config.json`.

**If `config.json` does NOT exist**, copy `SKILL_DIR/config.example.json` to
`SKILL_DIR/config.json`, then use the Ask tool to collect any values the user wants
to change. Fields:

1. **outputDir**: where cards are saved. Default: `~/amigoscode-skills/x-card`.
2. **profilePhoto**: circular avatar on the card. Default: `assets/profile.png`
   (bundled). A relative path is resolved against `SKILL_DIR`.
3. **name**: display name shown next to the tick (e.g. `Nelson Djalo`).
4. **handle**: the @handle under the name (e.g. `@nelsonamigoscode`).
5. **retweets** / **likes**: the stat strings (e.g. `306`, `3.1K`).
6. **ctaLine**: closing call-to-action line appended to the LinkedIn caption.
7. **newsletterUrl** / **newsletterLine**: optional newsletter subscribe line. If
   `newsletterUrl` is empty, the subscribe line is omitted.

**If `config.json` exists**, load it and use these values. Relative `profilePhoto`
paths resolve against `SKILL_DIR`; expand a leading `~`. A missing photo or font
falls back to the bundled copy.

## Output Structure

Each card goes into a topic folder under `outputDir`:

```
<outputDir>/<topic-slug>/
├── x-card.png          # the X-style quote card
├── linkedin-post.txt   # long-form caption + hashtags
└── first-comment.txt   # the first comment (usually a link), if provided
```

## Inputs

Collect from the user or conversation:

| Input | Description |
|---|---|
| `lines` | The X card body — a short, punchy quote (the visual hook). Each string is ONE rendered line (no auto-wrapping); use `""` for a blank line between paragraphs. 5-10 lines max. |
| `caption` | The long-form LinkedIn post, written with the senior-engineer-mentor prompt below. |
| `hashtags` | Hashtags for the post (e.g. `#AI #SoftwareDevelopment`). |
| `firstComment` | First-comment text (usually a link). |
| `topicSlug` | Kebab-case topic for the output folder (e.g. `ai-training-gap`). |

`name`, `handle`, `profilePhoto`, `retweets`, and `likes` come from `config.json`.

## Steps

1. Collect the inputs above from the conversation.
2. Write a JSON config file to `SKILL_DIR/output/xcard-<topic-slug>.json`, merging
   the card content with the identity/branding fields from `config.json`:

```json
{
  "lines": ["Line one", "", "Line two"],
  "caption": "Full post text here...",
  "hashtags": "#AI #SoftwareDevelopment",
  "firstComment": "Learn more at amigoscode.com",
  "profilePhoto": "<config.profilePhoto, resolved to absolute>",
  "name": "<config.name>",
  "handle": "<config.handle>",
  "retweets": "<config.retweets>",
  "likes": "<config.likes>",
  "outputDir": "<config.outputDir>/<topic-slug>/"
}
```

3. Run: `python3 SKILL_DIR/scripts/generate_card.py --config-file <path>`
4. The script prints JSON with the file paths. Show the `x-card.png` to the user.
5. Iterate on the quote lines or styling as requested.

## Notes

- **Auto-scaling**: body font scales 42-72px to fill the space. Short quotes get
  large and punchy; longer quotes stay readable.
- **Line wrapping**: split long sentences manually across `lines` — each string is
  one line. Use `""` for paragraph spacing.
- **Output**: always 1080x1350px (4:5) at 300dpi, ready for LinkedIn/Instagram.
- **Stats bar**: retweet and like counts come from `config.json`.

## Caption Writing

The card image carries the **punchy hook** (the short quote). The `caption` field
carries the **long-form educational LinkedIn post** that goes under the image.

**Before writing, READ `SKILL_DIR/../infographic/assets/caption-examples.md`** (the
sibling infographic skill) end-to-end. It has a menu of strong hook patterns and
worked examples. Pick a hook that matches the topic and rotate styles. If that file
is not present, follow the inline system prompt below.

**Branding lines (from `config.json`, do not prompt every run):**
- End the caption with `config.ctaLine` verbatim as the final line.
- If `config.newsletterUrl` is non-empty, add the subscribe line just before the
  CTA: take `config.newsletterLine` and replace `{{NEWSLETTER_URL}}` with
  `config.newsletterUrl`. Use the `→` symbol. If empty, omit it.

**Caption system prompt:**

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

The opener is the single most important line. Pick ONE of these eight hook patterns and use it:
1. Contrast / parallelism — "Juniors do X. Seniors do Y."
2. Direct reframe — "X is not magic. It is Y."
3. Specific concrete pain — name an exact symptom the reader has felt
4. Imperative / challenge — "Stop doing X." or "Read X before Y."
5. Counter-intuitive claim — open with something readers do not expect to be true
6. Specific number / fact — anchor in a concrete count or surprising statistic
7. Question — ask something the reader cannot confidently answer
8. Incident / story — open with a real (or representative) failure

NEVER open with:
- "Today we are going to talk about..."
- "Let me tell you about..."
- Restating the card quote
- Any sentence starting with the word "I"

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

The card `lines` (the short quote on the image) are NOT bound by this prompt — keep
those punchy and short. Only the long-form `caption` follows the senior-mentor prompt.
