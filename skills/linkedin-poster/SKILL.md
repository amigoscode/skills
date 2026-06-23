---
name: linkedin-poster
description: Fully autonomous LinkedIn poster. Drives the LinkedIn web composer via Playwright/TypeScript to publish posts immediately OR schedule them for a future slot (text, PDF carousel, or image post), one or many in a single browser session. Use when the user asks to "post this on LinkedIn", "post this now", "schedule a LinkedIn post", "schedule this carousel/x-card on LinkedIn", "post this on LinkedIn at <time>", "schedule my week on LinkedIn", or to publish/queue any prepared post folder (linkedin-post.txt + optional carousel.pdf or images) to LinkedIn.
---

# LinkedIn Poster

Single TypeScript driver (`schedule.ts`) opens Chromium, signs in once, and publishes or schedules every post in the config file in one continuous session. No step-by-step babysitting — the entire flow (composer open → media upload → body paste → post or date/time pick → confirm) is automated for every post.

**Each post is either immediate or scheduled:**
- A post with **no `schedule`** (or `schedule: "now"`) is **published immediately**.
- A post with a `schedule` (ISO local datetime) is **queued for that time**.

You can mix both in the same batch.

## When to use

Trigger when:

- The user asks to post, publish, schedule, or queue one or many LinkedIn posts (now or at a specific date/time).
- A post folder already exists with at least `linkedin-post.txt`. Optionally `carousel.pdf` or image PNG/JPG files.
- The user wants to publish now ("post this on LinkedIn") or schedule a whole week in one command — just pass all posts in the `posts` array.

Do not use for:

- Reposting / commenting on other people's posts.
- Editing or deleting already-published or already-scheduled posts.

## Prerequisites

One-time setup:

```bash
cd "${CLAUDE_PLUGIN_ROOT}/skills/linkedin-poster/scripts"
npm install
npx playwright install chromium
```

The script uses `tsx` to run TypeScript directly — no build step.

## Session and login

The script handles login with a saved-session-first strategy:

1. **If a saved session exists** (`scripts/state/linkedin.json`), it is loaded silently and the run can go fully headless. No prompt.
2. **If there is no saved session**, the script opens a visible Chromium and waits up to 5 minutes for you to sign in to LinkedIn manually. The moment you land on `/feed/`, it saves the session to `state/linkedin.json` and reuses it on every subsequent run.

So: **log in once, never again.** The session file is gitignored and never leaves the machine.

Advanced: `userDataDir` lets you adopt an already-logged-in Chrome/Chromium profile instead of the saved session (e.g. a Playwright MCP profile). Set it to `"playwright-mcp"` to auto-pick the most recent `~/Library/Caches/ms-playwright/mcp-chrome-*` profile on macOS, or to an explicit profile path. That profile must not be open in another Chromium at the same time.

## Config schema

```ts
interface Config {
  posts: Post[];
  headless?: boolean;     // default false — needs a visible window for first-time login
  dryRun?: boolean;       // stops before the final "Post"/"Schedule" click
  keepOpen?: boolean;     // do not close the browser when finished (waits for SIGINT)
  userDataDir?: string;   // advanced: reuse an existing Chrome profile instead of state/linkedin.json
}

interface Post {
  postDir: string;        // absolute or ~/-prefixed path, must contain linkedin-post.txt
  media?:
    | { type: "text" }
    | { type: "pdf"; path: string; title: string }
    | { type: "images"; paths: string[]; altText?: string };
  schedule?: string;      // ISO local datetime, e.g. "2026-05-12T08:30". OMIT (or "now") to publish immediately.
  postFile?: string;      // override which file holds the body (default: linkedin-post.txt)
}
```

When scheduling, the minute must be `:00`, `:15`, `:30`, or `:45` — LinkedIn's picker only offers those slots. The script throws early if you pass any other minute. Immediate posts have no minute constraint.

## Examples

**Post an image immediately** (no `schedule` → publishes now)

```json
{
  "posts": [
    {
      "postDir": "~/amigoscode-skills/infographic/How Docker Works",
      "postFile": "caption.txt",
      "media": {
        "type": "images",
        "paths": ["~/amigoscode-skills/infographic/How Docker Works/How Docker Works.png"],
        "altText": "How Docker works infographic."
      }
    }
  ]
}
```

**Schedule a PDF carousel for a future slot**

```json
{
  "posts": [
    {
      "postDir": "~/posts/2-tue-spring-security-filter-chain",
      "media": {
        "type": "pdf",
        "path": "~/posts/2-tue-spring-security-filter-chain/carousel.pdf",
        "title": "How Spring Security Works"
      },
      "schedule": "2026-05-12T08:30"
    }
  ]
}
```

**Mixed batch — one now, the rest scheduled** (one browser session, one login)

```json
{
  "keepOpen": true,
  "posts": [
    { "postDir": "~/posts/1-now-launch", "media": { "type": "images", "paths": ["~/posts/1-now-launch/x-card.png"], "altText": "..." } },
    { "postDir": "~/posts/2-tue", "media": { "type": "pdf", "path": "~/posts/2-tue/carousel.pdf", "title": "..." }, "schedule": "2026-05-12T08:30" },
    { "postDir": "~/posts/3-wed", "media": { "type": "images", "paths": ["~/posts/3-wed/infographic.png"], "altText": "..." }, "schedule": "2026-05-13T08:30" }
  ]
}
```

**Text-only post, immediately**

```json
{ "posts": [ { "postDir": "~/posts/some-folder" } ] }
```

## Running

```bash
npx tsx "${CLAUDE_PLUGIN_ROOT}/skills/linkedin-poster/scripts/schedule.ts" \
  --config-file /tmp/linkedin-poster.json
```

## Output

Stdout (machine-readable JSON). `status` is `"posted"` for immediate posts, `"scheduled"` for future slots:

```json
{
  "results": [
    {
      "status": "posted",
      "schedule": "now",
      "postDir": "/Users/.../How Docker Works",
      "media": { "type": "images", "paths": ["/Users/.../How Docker Works.png"], "altText": "..." }
    },
    {
      "status": "scheduled",
      "schedule": "2026-05-12T08:30",
      "postDir": "/Users/.../2-tue-spring-security-filter-chain",
      "media": { "type": "pdf", "path": "/Users/.../carousel.pdf", "title": "How Spring Security Works" }
    }
  ]
}
```

Stderr has human progress lines prefixed `[linkedin-poster]`.

A failed post does not abort the batch — the script resets to the feed and continues with the next post. Inspect `results` for any `status: "error"` entries.

## Flags recap

| Flag | Effect |
|---|---|
| `headless: true` | No window. Only safe after a logged-in `state/linkedin.json` exists. |
| `dryRun: true` | Walks every post through the composer (and schedule dialog), then stops before the final Post/Schedule click. Nothing is committed. |
| `keepOpen: true` | After the last post the browser window stays open and the process waits for Ctrl+C. Use when chaining more uploads or reviewing results. |

## Notes after a run

- Immediate posts are live right away. Scheduled posts appear in LinkedIn's queue at `linkedin.com/feed/?view=management`.
- LinkedIn does not accept first comments via the web composer flow. If a post needs a first comment (e.g. a link), paste it manually after the post publishes.

## DOM contract (when LinkedIn redesigns, fix here)

**Composer**

- `button[name="Start a post"]` — opens composer.
- `textbox[name=/Text editor for creating/]` — the contenteditable body.
- `button[name="Post"]` (exact) — publishes immediately.
- `button[name="Schedule post"]` — opens the schedule dialog.

**Document (PDF) flow**

- `button[name="More"]` then `button[name="Add a document"]` then text `"Choose file"` → filechooser.
- `textbox[name=/Document title/]` → `button[name="Done"]`.

**Image flow**

- `button[name="Add media"]` opens filechooser directly (no More menu).
- `dialog[name="Editor"]` opens with thumbnails.
- Optional alt text: `button[name="Alternative text"]` → `textbox[name=/Alt text/i]` → **`button[name="Add"]`** (LinkedIn labels the save action "Add", not "Save").
- `button[name="Next"]` inside the Editor returns to the composer.

**Immediate post**

- `button[name="Post"]` (exact) commits the share. The composer dialog closing is the success signal.

**Schedule dialog**

- `textbox[name="Date"]` accepts `M/D/YYYY` and shows a calendar overlay.
  Click the day cell `button[name="<Weekday>, <Month> <D>, <YYYY>."]` instead of typing — typing + Escape can fire LinkedIn's "Save as draft?" confirm prompt.
- `combobox[name="Time"]` → `option[name="HH:MM AM/PM"]`.
- `button[name="Next"]` → `button[name="Schedule"]` (exact, not "Schedule post").
- Toast `"Post scheduled."` confirms success.

**Recovery from interruption**

If "Save this post as a draft?" appears (alertdialog), the script dismisses it by clicking `Discard` before retrying.

## What the script does *not* handle

- Adding the first comment after the post publishes (LinkedIn limitation).
- Tagging people / companies in the post body.
- Uploading native video, polls, celebrate-an-occasion, or "Find an expert".
- Scheduling more than 90 days out (LinkedIn restriction).
- Editing or deleting already-published or already-scheduled posts (use `linkedin.com/feed/?view=management` manually).
