# x-card

Generate a social media quote card styled like a dark-mode X (Twitter) post: a
circular profile photo with a blue verified tick, name, handle, a punchy body
quote, and retweet/like stats. Exports a 1080x1350 PNG (4:5) plus a long-form
LinkedIn caption.

Packaged as a [Claude Code](https://claude.com/claude-code) skill. The renderer
(`scripts/generate_card.py`) is a standalone Pillow script you can run on its own.

## Features

- **Tweet-style card.** Black background, circular avatar, blue tick, name/handle,
  and a stats bar — no border, no rounded card.
- **Auto-scaling quote.** The body font scales 42-72px so short quotes are big and
  punchy while longer ones stay readable.
- **Crisp output.** 2x supersampling, 1080x1350 at 300dpi, ready for LinkedIn or
  Instagram.
- **Self-contained.** The display fonts (Outfit, Work Sans), the verified badge,
  and a default profile photo are bundled in `assets/`.
- **Configurable.** Profile photo, name, handle, stats, and the caption CTA /
  newsletter lines all live in `config.json`.

## Prerequisites

- Python 3 with Pillow: `pip install pillow` (numpy not required).

## Configuration

On first run the skill copies [`config.example.json`](./config.example.json) to
`config.json` (gitignored) and asks for any values you want to change:

```jsonc
{
  "outputDir": "~/amigoscode-skills/x-card", // where cards are saved
  "profilePhoto": "assets/profile.png",       // circular avatar (relative paths resolve to the skill dir)
  "name": "Your Name",                         // shown next to the tick
  "handle": "@yourhandle",                     // under the name
  "retweets": "306",                            // stats bar
  "likes": "3.1K",
  "ctaLine": "Follow for practical lessons...", // caption closing line
  "newsletterUrl": "",                          // empty omits the subscribe line
  "newsletterLine": "One backend lesson in your inbox every week → {{NEWSLETTER_URL}}"
}
```

Replace `assets/profile.png` in place to change the default avatar, or point
`profilePhoto` at any file (absolute or `~`-prefixed).

## Usage

Ask the agent, for example:

> Make an X card: "Juniors write code. Seniors delete it."

The skill renders the card and writes the caption to
`<outputDir>/<topic-slug>/`.

To run the renderer directly:

```bash
python3 scripts/generate_card.py --config-file /path/to/xcard-config.json
```

## Output

Each run writes to `<outputDir>/<topic-slug>/`:

- `x-card.png` — the quote card
- `linkedin-post.txt` — long-form caption + hashtags

## Pairs with linkedin-poster

Generate a card here, then publish it with the
[`linkedin-poster`](../linkedin-poster) skill as an image post.

## License

MIT. See [LICENSE](./LICENSE).
