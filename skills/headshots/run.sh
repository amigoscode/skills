#!/usr/bin/env bash
#
# headshots/run.sh — helpers for generating LinkedIn-style portraits from a
# reference photo using the bundled scripts/edit.ts generator. Two subcommands:
#
#   run.sh fetch --source <url|path> --name <kebab>
#       Download + validate the reference photo into the output folder ONCE.
#       Prints the resolved reference path (and nothing else) on stdout.
#
#   run.sh one --ref <ref-path> --name <kebab> --style <slug> [--smile] [--background <color>]
#       Generate ONE style with the bundled generator. Prints the saved image path.
#
# The skill calls `fetch` once, then dispatches one subagent per style, each
# running `one`. Output goes to ~/amigoscode-skills/headshots/.

set -uo pipefail

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS="$SKILL_DIR/scripts"
OUTDIR="$HOME/amigoscode-skills/headshots"
PROMPTS="$SKILL_DIR/prompts.json"

err() { echo "Error: $1" >&2; exit "${2:-1}"; }

CMD="${1:-}"; shift || true
SOURCE="" NAME="" REF="" STYLE="" SMILE="" BGCOLOR=""
while [ $# -gt 0 ]; do
  case "$1" in
    --source)     SOURCE="$2"; shift 2 ;;
    --name)       NAME="$2"; shift 2 ;;
    --ref)        REF="$2"; shift 2 ;;
    --style)      STYLE="$2"; shift 2 ;;
    --smile)      SMILE="1"; shift ;;
    --background) BGCOLOR="$2"; shift 2 ;;
    *) err "unknown arg: $1" ;;
  esac
done

mkdir -p "$OUTDIR"

case "$CMD" in
  fetch)
    [ -n "$SOURCE" ] || err "--source is required"
    [ -n "$NAME" ]   || err "--name is required"
    # Bootstrap dependencies once here (fetch runs a single time before the
    # per-style agents fan out, so there is no concurrent npm-install race).
    if [ ! -d "$SKILL_DIR/node_modules" ]; then
      echo "Installing dependencies (first run)..." >&2
      ( cd "$SKILL_DIR" && npm install ) >&2 || err "npm install failed in $SKILL_DIR"
    fi
    REF_BASE="$OUTDIR/$NAME-reference"
    EXISTING="$(ls "$REF_BASE".* 2>/dev/null | grep -vE '\.(log|download)$' | head -1)"
    if [ -n "$EXISTING" ] && [ -s "$EXISTING" ]; then
      echo "Reference already present (skipping download)" >&2
      echo "$EXISTING"; exit 0
    fi
    TMP="$REF_BASE.download"
    if [[ "$SOURCE" =~ ^https?:// ]]; then
      echo "Downloading reference..." >&2
      curl -fL --retry 2 -s "$SOURCE" -o "$TMP" \
        || err "could not download the photo (404/403). LinkedIn/Skool links expire fast — ask the user for a fresh URL." 2
    else
      SRC="${SOURCE/#\~/$HOME}"
      [ -f "$SRC" ] || err "local source not found: $SOURCE" 2
      cp "$SRC" "$TMP"
    fi
    case "$(file -b --mime-type "$TMP")" in
      image/jpeg) EXT="jpg" ;;
      image/png)  EXT="png" ;;
      image/webp) EXT="webp" ;;
      *) rm -f "$TMP"; err "source is not a valid JPEG/PNG/WebP image" 2 ;;
    esac
    mv "$TMP" "$REF_BASE.$EXT"
    echo "Reference saved: $REF_BASE.$EXT" >&2
    echo "$REF_BASE.$EXT"
    ;;

  one)
    [ -n "$REF" ]   || err "--ref is required"
    [ -n "$NAME" ]  || err "--name is required"
    [ -n "$STYLE" ] || err "--style is required"
    [ -s "$REF" ]   || err "reference not found at $REF (re-run fetch)" 2
    [ -f "$SCRIPTS/edit.ts" ] || err "bundled generator missing at $SCRIPTS/edit.ts"
    [ -d "$SKILL_DIR/node_modules" ] || err "dependencies not installed (run fetch first, or 'npm install' in $SKILL_DIR)"

    MAPPED="$(STYLE="$STYLE" SMILE="$SMILE" BGCOLOR="$BGCOLOR" python3 - "$PROMPTS" <<'PY'
import json, os, sys
data = json.load(open(sys.argv[1]))
slug = os.environ["STYLE"]
st = next((s for s in data["styles"] if s["slug"] == slug), None)
if not st: sys.exit(f"unknown style slug: {slug}")
if st.get("standalone"):
    # e.g. "restore": keep the original composition, so use the body verbatim
    # and skip the portrait prefix/suffix and the smile/background add-ons.
    prompt = st["body"]
else:
    parts = [data["prefix"], st["body"]]
    if os.environ.get("SMILE"): parts.append(data["smile_addon"])
    bg = os.environ.get("BGCOLOR","").strip()
    if bg: parts.append(data["background_template"].replace("{COLOR}", bg))
    parts.append(data["suffix"])
    prompt = " ".join(parts)
print(f'{st["n"]}\t{prompt}')
PY
)"
    N="${MAPPED%%$'\t'*}"; PROMPT="${MAPPED#*$'\t'}"
    OUT="$OUTDIR/$NAME-$N-$STYLE.png"
    # Route edit.ts chatter (dotenv lines, "Image saved") to stderr so this
    # command's stdout is ONLY the final image path the agent should report.
    ( cd "$SKILL_DIR" && npx tsx scripts/edit.ts --input "$REF" --prompt "$PROMPT" --output "$OUT" ) >&2 \
      || err "generation failed for style '$STYLE' (if ENOENT, the reference moved — re-run fetch)" 3
    FINAL="$(ls "$OUTDIR/$NAME-$N-$STYLE".* 2>/dev/null | grep -vE '\.(log|download)$' | head -1)"
    echo "${FINAL:-$OUT}"
    ;;

  *)
    err "usage: run.sh fetch|one ... (see header)"
    ;;
esac
