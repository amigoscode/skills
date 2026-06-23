# Amigoscode Plugin

A [Claude Code](https://claude.com/claude-code) plugin bundling Amigoscode's content tools. Install once and get both skills under the `amigoscode:` namespace.

## Skills

| Skill | What it does |
|---|---|
| `amigoscode:infographic` | Generates branded "HOW X WORKS" educational infographics (hand-drawn style diagrams) about backend/Java topics, composited onto a branded template and exported as a final PNG, plus a ready-to-post caption. |
| `amigoscode:linkedin-poster` | Fully autonomous LinkedIn poster. Publishes immediately or schedules posts (text, PDF carousel, or image) by driving the LinkedIn web composer with Playwright. |

## Installation

### Option 1: CLI install (recommended)

Use [npx skills](https://github.com/vercel-labs/skills) to install the skills directly:

```bash
# Install both skills
npx skills add amigoscode/amigoscode-plugin

# Install just one
npx skills add amigoscode/amigoscode-plugin --skill infographic

# List what is available
npx skills add amigoscode/amigoscode-plugin --list
```

This installs to your `.agents/skills/` directory and symlinks into `.claude/skills/` for Claude Code compatibility. One command, no marketplace step.

### Option 2: Claude Code plugin

Install via Claude Code's built-in plugin system:

```bash
# Add the marketplace
/plugin marketplace add amigoscode/amigoscode-plugin

# Install the plugin
/plugin install amigoscode
```

Then the skills resolve as `amigoscode:infographic` and `amigoscode:linkedin-poster`.

### Option 3: Clone and copy

```bash
git clone https://github.com/amigoscode/amigoscode-plugin.git
cp -r amigoscode-plugin/skills/* ~/.claude/skills/
```

Once installed, the skills activate automatically based on what you ask for, or you can invoke them directly (e.g. `/amigoscode:infographic`).

## Per-skill setup

Each skill has its own dependencies and one-time setup. See the skill READMEs:

- [`skills/infographic/README.md`](./skills/infographic/README.md) — needs a `GEMINI_API_KEY` and `npm install` for the diagram generator and Playwright screenshot step.
- [`skills/linkedin-poster/README.md`](./skills/linkedin-poster/README.md) — needs `npm install` + `npx playwright install chromium`, then a one-time LinkedIn login that is saved for future runs.

Secrets (`.env`) and personal config (`config.json`, saved LinkedIn sessions) are gitignored and never bundled. Copy the `.example` files and fill in your own.

## Layout

```
amigoscode-plugin/
├── .claude-plugin/
│   ├── plugin.json         # plugin manifest (name: amigoscode)
│   └── marketplace.json    # marketplace listing
└── skills/
    ├── infographic/
    └── linkedin-poster/
```

## License

MIT. See [LICENSE](./LICENSE).
