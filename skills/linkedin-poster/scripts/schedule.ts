#!/usr/bin/env -S npx tsx
/**
 * linkedin-poster — fully autonomous Playwright driver for LinkedIn.
 *
 * Publishes posts immediately or schedules them for a future slot, one or many
 * in a single browser session.
 *
 * Run:
 *   npx tsx schedule.ts --config-file <path-to-json>
 *
 * Config schema: see Config and ScheduledPost below. One config can hold many
 * posts and the browser stays open between them, so a whole week goes out in
 * one shot. A post with a `schedule` is queued for that time; a post with no
 * `schedule` (or `schedule: "now"`) is published immediately. Set
 * `keepOpen: true` to leave the browser running at the end.
 *
 * First run opens a visible Chromium. Log in once — the session is saved to
 * state/linkedin.json and reused (headless-capable) on every subsequent run.
 */

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from "playwright";
import { readFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

// ---------- config types ----------

type TextMedia = { type: "text" };
type PdfMedia = { type: "pdf"; path: string; title: string };
type ImageMedia = { type: "images"; paths: string[]; altText?: string };
type Media = TextMedia | PdfMedia | ImageMedia;

interface ScheduledPost {
  postDir: string;        // must contain linkedin-post.txt
  media?: Media;          // omit for text-only post
  schedule?: string;      // ISO local datetime on a 15-minute boundary. OMIT (or set "now") to publish immediately.
  postFile?: string;      // override which file inside postDir holds the body (default: linkedin-post.txt)
}

interface Config {
  posts: ScheduledPost[];
  headless?: boolean;     // default false — needs a window for first-time login
  dryRun?: boolean;       // stop before final Schedule click
  keepOpen?: boolean;     // do not close the browser when finished (waits for SIGINT)

  /**
   * Reuse an existing Chrome/Chromium user profile directory instead of the
   * script's `state/linkedin.json` storage. Useful when the user is already
   * signed in to LinkedIn in another headed Chromium (e.g. the Playwright MCP
   * server's profile) — point at that profile and the script will adopt the
   * same session without prompting for login.
   *
   * Set to `"playwright-mcp"` to auto-detect the most recent
   * `~/Library/Caches/ms-playwright/mcp-chrome-*` profile on macOS.
   *
   * The profile is exclusive: any other Chromium using the same userDataDir
   * MUST be closed before launching the script.
   */
  userDataDir?: string;
}

interface PostResult {
  status: "posted" | "scheduled" | "dryRun" | "error";
  schedule: string;       // the ISO datetime, or "now" for an immediate post
  postDir: string;
  media: Media | null;
  error?: string;
}

// ---------- paths and small utilities ----------

const HERE = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = join(HERE, "state");
const STATE_FILE = join(STATE_DIR, "linkedin.json");
const LOG = (...a: unknown[]) => console.error("[linkedin-poster]", ...a);

/** A post is immediate when it has no schedule, or schedule is the literal "now". */
function isImmediate(post: ScheduledPost): boolean {
  return !post.schedule || post.schedule.trim().toLowerCase() === "now";
}
const IS_MAC = process.platform === "darwin";
const PASTE_KEY = IS_MAC ? "Meta+v" : "Control+v";

function parseArgs(): Config {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--config-file");
  if (idx === -1 || !args[idx + 1]) {
    throw new Error("Missing --config-file <path>");
  }
  const cfg = JSON.parse(readFileSync(args[idx + 1], "utf8")) as Partial<Config>;
  if (!cfg.posts || !Array.isArray(cfg.posts) || cfg.posts.length === 0) {
    throw new Error("Config must include a non-empty `posts` array");
  }
  return cfg as Config;
}

function expandHome(p: string): string {
  return p.startsWith("~/") ? join(homedir(), p.slice(2)) : p;
}

/** LinkedIn's Date input expects M/D/YYYY with no leading zeros. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

/**
 * LinkedIn's Time picker only offers :00, :15, :30, :45 slots. Returns the
 * label LinkedIn renders for the dropdown option, e.g. "8:30 AM".
 */
function formatTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  if (m % 15 !== 0) {
    throw new Error(
      `Time ${h}:${String(m).padStart(2, "0")} is not on a 15-minute boundary — LinkedIn only offers slots at :00, :15, :30, :45`,
    );
  }
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

function validatePost(post: ScheduledPost): { postDir: string; postText: string; media: Media | null } {
  const postDir = expandHome(post.postDir);
  if (!postDir || !existsSync(postDir)) throw new Error(`postDir not found: ${postDir}`);

  const bodyFile = post.postFile ?? "linkedin-post.txt";
  const bodyPath = join(postDir, bodyFile);
  if (!existsSync(bodyPath)) throw new Error(`Post body not found: ${bodyPath}`);
  const postText = readFileSync(bodyPath, "utf8").trimEnd();
  if (!postText) throw new Error(`Post body is empty: ${bodyPath}`);

  // No schedule (or "now") means publish immediately. Only validate the
  // 15-minute boundary when an actual future slot was given.
  if (!isImmediate(post)) {
    formatTime(post.schedule as string); // throws if minute isn't on a 15-min boundary
  }

  let media: Media | null = null;
  if (post.media) {
    if (post.media.type === "pdf") {
      const path = expandHome(post.media.path);
      if (!existsSync(path)) throw new Error(`pdf not found: ${path}`);
      if (!post.media.title) throw new Error("media.title is required for pdf posts");
      media = { type: "pdf", path, title: post.media.title };
    } else if (post.media.type === "images") {
      if (!post.media.paths?.length) throw new Error("media.paths must be a non-empty array");
      const paths = post.media.paths.map(expandHome);
      for (const p of paths) {
        if (!existsSync(p)) throw new Error(`image not found: ${p}`);
      }
      media = { type: "images", paths, altText: post.media.altText };
    } else {
      media = { type: "text" };
    }
  }

  return { postDir, postText, media };
}

// ---------- Playwright flows ----------

async function ensureLoggedIn(context: BrowserContext, page: Page): Promise<void> {
  await page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login") || page.url().includes("/uas/login")) {
    LOG("Not logged in — complete login in the browser window.");
    LOG("Waiting up to 5 minutes for you to land on /feed/ …");
    await page.waitForURL(/linkedin\.com\/feed\//, { timeout: 5 * 60_000 });
    await context.storageState({ path: STATE_FILE });
    LOG("Login saved.");
  }
}

async function openComposer(page: Page): Promise<void> {
  // Ensure we're on the feed (between batched posts the URL may have drifted).
  if (!page.url().includes("/feed")) {
    await page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded" });
  }
  await page.getByRole("button", { name: "Start a post" }).first().click();
  await page.getByRole("dialog").first().waitFor({ state: "visible" });
}

async function attachPdf(page: Page, pdfPath: string, title: string): Promise<void> {
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("button", { name: "Add a document" }).click();
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByText("Choose file", { exact: true }).click(),
  ]);
  await chooser.setFiles(pdfPath);
  await page.getByRole("textbox", { name: /Document title/ }).fill(title);
  await page.getByRole("button", { name: "Done", exact: true }).click();
}

async function attachImages(page: Page, imagePaths: string[], altText?: string): Promise<void> {
  // "Add media" toolbar button opens the filechooser directly — no "More" menu.
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Add media" }).click(),
  ]);
  await chooser.setFiles(imagePaths);

  const editor = page.getByRole("dialog", { name: "Editor" });
  await editor.waitFor({ state: "visible" });

  if (altText) {
    for (let i = 0; i < imagePaths.length; i++) {
      if (i > 0) {
        await editor.locator('button[aria-label^="Select "]').nth(i).click();
      }
      await editor.getByRole("button", { name: "Alternative text", exact: true }).click();
      // The alt-text panel opens inside the same Editor dialog.
      const altBox = page.getByRole("textbox", { name: /Alt text/i });
      await altBox.fill(altText);
      // LinkedIn labels the confirm button "Add" (not "Save"). Match exactly so
      // we don't pick the wrong "Add" button elsewhere on the page.
      await editor.getByRole("button", { name: "Add", exact: true }).click();
    }
  }

  await editor.getByRole("button", { name: "Next", exact: true }).click();
  await editor.waitFor({ state: "hidden" }).catch(() => {});
}

async function writeBody(page: Page, text: string): Promise<void> {
  const editor = page.getByRole("textbox", { name: /Text editor for creating/ });
  await editor.click();

  // Clipboard paste preserves Unicode arrows and contiguous hashtag styling
  // better than .type(), and crucially does not wipe the attached media card
  // the way .fill() on a contenteditable does.
  await page.evaluate(async (t: string) => {
    await navigator.clipboard.writeText(t);
  }, text);
  await page.keyboard.press(PASTE_KEY);
  await page.waitForTimeout(400);
}

async function scheduleAt(page: Page, iso: string, dryRun: boolean): Promise<void> {
  // Wait for any leftover "Post scheduled." toast from the previous batched
  // post to disappear before we begin. Otherwise the post-click toast check at
  // the end of this function would short-circuit on the stale toast and we'd
  // declare success without LinkedIn having actually committed the new post.
  await page.getByText("Post scheduled.", { exact: false }).first()
    .waitFor({ state: "hidden", timeout: 15_000 })
    .catch(() => { /* no prior toast — fine */ });

  await page.getByRole("button", { name: "Schedule post", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Schedule post" });
  await dialog.waitFor({ state: "visible" });

  // Set the date by clicking the calendar cell. Typing the textbox + Escape
  // also worked but Escape sometimes triggered LinkedIn's "Save as draft?"
  // confirm dialog; clicking a cell never does and always commits cleanly.
  await pickDate(page, dialog, iso);

  // Time — open the combobox and pick the matching 15-minute slot.
  await dialog.getByRole("combobox", { name: "Time" }).click();
  await page.getByRole("option", { name: formatTime(iso), exact: true }).click();

  const summary = await dialog.locator("p", { hasText: "based on your location" }).textContent();
  LOG("Summary:", summary?.trim());

  await dialog.getByRole("button", { name: "Next", exact: true }).click();

  if (dryRun) {
    LOG("dryRun: stopping before final Schedule click");
    return;
  }

  // Watch for the composer dialog to disappear first — that only happens once
  // LinkedIn has accepted the schedule server-side. Then verify the toast.
  // Both signals together prevent matching a stale toast from a prior post.
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await dialog.waitFor({ state: "hidden", timeout: 20_000 });
  await page.getByText("Post scheduled.", { exact: false }).first()
    .waitFor({ state: "visible", timeout: 20_000 });

  // The toast appears optimistically — LinkedIn renders success before the
  // commit XHR finishes. If the browser is closed in the next 1-2s (i.e. this
  // was the last post in the batch), the request is cancelled and the post
  // never actually lands. Wait for the network to settle so the final POST
  // succeeds before any caller decides to tear down the browser.
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2_000);

  LOG("Post scheduled.");
}

async function postNow(page: Page, dryRun: boolean): Promise<void> {
  // Clear any leftover success toast ("Post successful." / "Post scheduled.")
  // from a previous batched post so the check below cannot match a stale one.
  await page.getByText(/Post (successful|scheduled)\./i).first()
    .waitFor({ state: "hidden", timeout: 15_000 })
    .catch(() => { /* no prior toast — fine */ });

  if (dryRun) {
    LOG("dryRun: stopping before final Post click");
    return;
  }

  const composer = page.getByRole("dialog").first();
  // The composer's share action is labelled exactly "Post" (distinct from the
  // feed's "Start a post" button, which we never match with exact: true).
  await page.getByRole("button", { name: "Post", exact: true }).click();

  // Composer closing is LinkedIn's signal that the share was accepted.
  await composer.waitFor({ state: "hidden", timeout: 20_000 });

  // The publish XHR fires optimistically; let the network settle before any
  // caller tears the browser down, otherwise the last post can be cancelled.
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2_000);

  LOG("Posted.");
}

async function pickDate(page: Page, dialog: Locator, iso: string): Promise<void> {
  const targetMonth = monthLabel(iso);
  const dateBox = dialog.getByRole("textbox", { name: "Date" });
  await dateBox.click();

  // Wait for the calendar overlay to settle.
  await page.waitForTimeout(150);

  // Step the calendar header to the target month using the next/prev buttons
  // until the visible month matches.
  await navigateCalendarMonth(dialog, targetMonth);

  // Click the specific day cell. LinkedIn names cells like "Wednesday, May 13, 2026.".
  const dayName = weekdayMonthDayName(iso);
  await dialog.getByRole("button", { name: dayName }).click();
}

function monthLabel(iso: string): string {
  const d = new Date(iso);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function weekdayMonthDayName(iso: string): string {
  const d = new Date(iso);
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${weekday}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}.`;
}

async function navigateCalendarMonth(dialog: Locator, targetMonth: string): Promise<void> {
  for (let i = 0; i < 24; i++) {
    const header = dialog.locator('[role="alert"]').first();
    const text = (await header.textContent())?.trim() ?? "";
    if (text === targetMonth) return;

    // Compare to decide forward vs back.
    const targetDate = parseMonthLabel(targetMonth);
    const currentDate = parseMonthLabel(text);
    if (!targetDate || !currentDate) return; // unable to parse, give up — date is already set in textbox
    const forward = targetDate.getTime() > currentDate.getTime();

    // The two unlabeled month nav buttons are immediately after the alert header.
    // Use the chevron buttons by their position — second of the pair is forward.
    const chevrons = dialog.locator('[role="alert"] ~ button, [role="alert"] + button');
    const back = chevrons.first();
    const forwardBtn = chevrons.nth(1);
    if (forward) await forwardBtn.click();
    else await back.click();
    await dialog.page().waitForTimeout(100);
  }
  throw new Error(`Could not navigate calendar to ${targetMonth} within 24 steps`);
}

function parseMonthLabel(label: string): Date | null {
  const m = label.match(/(\w+)\s+(\d{4})/);
  if (!m) return null;
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthIdx = months.indexOf(m[1]);
  if (monthIdx === -1) return null;
  return new Date(parseInt(m[2], 10), monthIdx, 1);
}

// ---------- main ----------

async function dismissDraftDialogIfOpen(page: Page): Promise<void> {
  const draft = page.getByRole("alertdialog", { name: "Save this post as a draft?" });
  if (await draft.isVisible({ timeout: 500 }).catch(() => false)) {
    await draft.getByRole("button", { name: "Discard", exact: true }).click();
    await draft.waitFor({ state: "hidden" }).catch(() => {});
  }
}

async function processPost(page: Page, post: ScheduledPost, dryRun: boolean): Promise<PostResult> {
  const { postDir, postText, media } = validatePost(post);

  await openComposer(page);

  if (media?.type === "pdf") await attachPdf(page, media.path, media.title);
  else if (media?.type === "images") await attachImages(page, media.paths, media.altText);

  await writeBody(page, postText);

  const immediate = isImmediate(post);
  if (immediate) await postNow(page, dryRun);
  else await scheduleAt(page, post.schedule as string, dryRun);

  // Some flows leave the composer open with a success toast; defensive cleanup
  // so the next iteration starts from a clean feed.
  await dismissDraftDialogIfOpen(page);

  return {
    status: dryRun ? "dryRun" : immediate ? "posted" : "scheduled",
    schedule: immediate ? "now" : (post.schedule as string),
    postDir: resolve(postDir),
    media,
  };
}

/**
 * Resolves the most recent Playwright-MCP Chromium profile directory.
 * macOS layout: ~/Library/Caches/ms-playwright/mcp-chrome-<hash>
 * Returns null if none found (caller will throw a clear error).
 */
function findPlaywrightMcpProfile(): string | null {
  const root = join(homedir(), "Library", "Caches", "ms-playwright");
  if (!existsSync(root)) return null;
  const candidates = readdirSync(root)
    .filter((n) => n.startsWith("mcp-chrome-"))
    .map((n) => ({ path: join(root, n), mtime: statSync(join(root, n)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return candidates[0]?.path ?? null;
}

async function main(): Promise<void> {
  const cfg = parseArgs();
  const headless = !!cfg.headless;
  const dryRun = !!cfg.dryRun;
  const keepOpen = !!cfg.keepOpen;

  mkdirSync(STATE_DIR, { recursive: true });

  let browser: Browser | null = null;
  let context: BrowserContext;

  if (cfg.userDataDir) {
    // Persistent-context mode: reuse an existing Chrome/Chromium profile (cookies
    // and storage already on disk). No separate `browser.close()` afterwards —
    // `context.close()` shuts the whole thing down.
    let profile = cfg.userDataDir === "playwright-mcp"
      ? findPlaywrightMcpProfile()
      : expandHome(cfg.userDataDir);
    if (!profile || !existsSync(profile)) {
      throw new Error(`userDataDir not found: ${cfg.userDataDir}. If "playwright-mcp" was passed, no mcp-chrome-* profile exists under ~/Library/Caches/ms-playwright/. Make sure the MCP browser ran at least once.`);
    }
    LOG(`Using persistent profile: ${profile}`);
    LOG("Close any other Chromium using this profile before this script launches.");
    context = await chromium.launchPersistentContext(profile, {
      headless,
      viewport: { width: 1400, height: 900 },
      permissions: ["clipboard-read", "clipboard-write"],
    });
  } else {
    browser = await chromium.launch({ headless });
    context = await browser.newContext({
      storageState: existsSync(STATE_FILE) ? STATE_FILE : undefined,
      viewport: { width: 1400, height: 900 },
      permissions: ["clipboard-read", "clipboard-write"],
    });
  }
  const page = context.pages()[0] ?? await context.newPage();

  const results: PostResult[] = [];

  try {
    await ensureLoggedIn(context, page);

    for (let i = 0; i < cfg.posts.length; i++) {
      const post = cfg.posts[i];
      LOG(`Post ${i + 1}/${cfg.posts.length}: ${post.postDir} → ${isImmediate(post) ? "post now" : post.schedule}`);
      try {
        const result = await processPost(page, post, dryRun);
        results.push(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        LOG(`Post ${i + 1} failed:`, message);
        results.push({
          status: "error",
          schedule: isImmediate(post) ? "now" : (post.schedule as string),
          postDir: post.postDir,
          media: null,
          error: message,
        });
        // Reset the page so the next post starts clean.
        await page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded" });
        await dismissDraftDialogIfOpen(page);
      }
    }

    // storageState dump is only meaningful when the script owns its own profile.
    // In persistent-context mode the cookies live in the userDataDir already.
    if (!cfg.userDataDir) {
      await context.storageState({ path: STATE_FILE });
    }

    console.log(JSON.stringify({ results }, null, 2));

    if (keepOpen) {
      LOG("keepOpen: browser stays open. Press Ctrl+C to exit.");
      await new Promise<void>(() => {});
    }
  } finally {
    if (!keepOpen) {
      if (browser) await browser.close();
      else await context.close();
    }
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
