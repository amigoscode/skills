# linkedin-poster

A fully autonomous LinkedIn poster. One TypeScript driver opens Chromium, signs you in once, and then publishes posts immediately or schedules them for a future slot, one or many in a single browser session. Text, PDF carousels, and image posts are all supported.

It is packaged as a [Claude Code](https://claude.com/claude-code) skill, but the core (`scripts/schedule.ts`) is a standalone Playwright script you can run on its own.

## Features

- **Post now or schedule later.** A post with no `schedule` publishes immediately. A post with a `schedule` is queued for that exact time. Mix both in one batch.
- **Batch in one session.** Pass many posts and they all go out in a single login, one after another.
- **Three media types.** Plain text, PDF document carousels, and single or multi image posts (with alt text).
- **Login once.** First run opens a visible browser for manual login, then saves the session and reuses it (headless-capable) forever after.
- **Resilient.** A failed post does not abort the batch; the script resets to the feed and continues, and reports every result as JSON.

## How it works

The script drives the real LinkedIn web composer with [Playwright](https://playwright.dev). For each post it opens the composer, attaches media, pastes the body text, then either clicks **Post** (immediate) or walks the **Schedule** dialog to set the date and time. It reuses your logged-in session so there is no API key and no LinkedIn developer app required.

## Prerequisites

- Node.js 18+ with `npx` available.
- A LinkedIn account.

## Installation

```bash
cd scripts
npm install
npx playwright install chromium
```

That installs the dependencies (Playwright + tsx) and the Chromium browser Playwright drives. There is no build step; `tsx` runs the TypeScript directly.

## First run and login

The script uses a saved-session-first strategy:

1. **No saved session yet** → it opens a visible Chromium and waits up to 5 minutes for you to sign in to LinkedIn manually. As soon as you reach your feed, it saves the session to `scripts/state/linkedin.json`.
2. **Saved session exists** → it loads silently and can run fully headless. No prompt.

Log in once, never again. The session file is gitignored and stays on your machine.

> Advanced: set `userDataDir` in the config to adopt an already-logged-in Chrome/Chromium profile instead (e.g. a Playwright MCP profile). Use `"playwright-mcp"` to auto-pick the most recent one on macOS, or pass an explicit profile path. That profile must not be open in another browser at the same time.

## Usage

Write a config JSON describing the posts, then run:

```bash
npx tsx scripts/schedule.ts --config-file /path/to/config.json
```

See [`config.example.json`](./config.example.json) for a starting point.

### Config schema

```ts
interface Config {
  posts: Post[];
  headless?: boolean;     // default false — needs a visible window for first-time login
  dryRun?: boolean;       // stop before the final Post/Schedule click (nothing is committed)
  keepOpen?: boolean;     // leave the browser open at the end (waits for Ctrl+C)
  userDataDir?: string;   // advanced: reuse an existing Chrome profile instead of state/linkedin.json
}

interface Post {
  postDir: string;        // absolute or ~/-prefixed path, must contain the body file
  media?:
    | { type: "text" }
    | { type: "pdf"; path: string; title: string }
    | { type: "images"; paths: string[]; altText?: string };
  schedule?: string;      // ISO local datetime, e.g. "2026-05-12T08:30". OMIT (or "now") to publish immediately.
  postFile?: string;      // override which file inside postDir holds the body (default: linkedin-post.txt)
}
```

The post body is read from `linkedin-post.txt` inside `postDir` (override with `postFile`). When scheduling, the minute must be `:00`, `:15`, `:30`, or `:45`, which is all LinkedIn's picker offers.

### Examples

Publish an image immediately (no `schedule`):

```json
{
  "posts": [
    {
      "postDir": "~/posts/launch-day",
      "media": { "type": "images", "paths": ["~/posts/launch-day/card.png"], "altText": "Launch announcement" }
    }
  ]
}
```

Schedule a PDF carousel:

```json
{
  "posts": [
    {
      "postDir": "~/posts/spring-security",
      "media": { "type": "pdf", "path": "~/posts/spring-security/carousel.pdf", "title": "How Spring Security Works" },
      "schedule": "2026-05-12T08:30"
    }
  ]
}
```

## Output

The script prints a JSON summary to stdout. `status` is `posted` for immediate posts and `scheduled` for future slots:

```json
{
  "results": [
    { "status": "posted", "schedule": "now", "postDir": "/Users/.../launch-day", "media": { "type": "images", "paths": ["/Users/.../card.png"] } },
    { "status": "scheduled", "schedule": "2026-05-12T08:30", "postDir": "/Users/.../spring-security", "media": { "type": "pdf", "path": "/Users/.../carousel.pdf", "title": "How Spring Security Works" } }
  ]
}
```

Human-readable progress goes to stderr, prefixed `[linkedin-poster]`.

## Flags

| Flag | Effect |
|---|---|
| `headless: true` | Run with no window. Only safe once a logged-in session exists. |
| `dryRun: true` | Walk every post through the composer, then stop before committing. |
| `keepOpen: true` | Keep the browser open after the last post (waits for Ctrl+C). |

## Limitations

LinkedIn's web composer does not expose everything, so the script does not:

- Add a first comment after publishing (paste links manually after the post goes live).
- Tag people or companies in the body.
- Upload native video, polls, or "celebrate an occasion".
- Schedule more than 90 days out.
- Edit or delete already-published or already-scheduled posts (use `linkedin.com/feed/?view=management`).

## When LinkedIn redesigns

All the selectors live in `scripts/schedule.ts` and are documented in the "DOM contract" section of [`SKILL.md`](./SKILL.md). If LinkedIn changes its markup, update them there.

## License

MIT. See [LICENSE](./LICENSE).
