#!/usr/bin/env bash
#
# One-line installer for the explainer-video skill.
#
#   curl -fsSL https://raw.githubusercontent.com/amigoscode/skills/main/skills/explainer-video/install.sh | bash
#
# Override the install location with EXPLAINER_VIDEO_SKILL_DIR.

set -euo pipefail

REPO_URL="https://github.com/amigoscode/skills.git"
DEST="${EXPLAINER_VIDEO_SKILL_DIR:-$HOME/.claude/skills/explainer-video}"

info() { printf '\033[1;35m==>\033[0m %s\n' "$1"; }
err()  { printf '\033[1;31mError:\033[0m %s\n' "$1" >&2; }

# Preflight: required tools
for cmd in git node npm npx ffmpeg ffprobe; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    err "'$cmd' is required but not found. Install it and re-run."
    exit 1
  fi
done

# API key scaffold
if [ ! -f "$DEST/.env" ] && [ -f "$DEST/.env.example" ]; then
  cp "$DEST/.env.example" "$DEST/.env"
  info "Created .env from .env.example"
fi

echo
info "Skill ready at $DEST"
printf '\033[1;33mNext:\033[0m\n'
printf '   - Add your ElevenLabs key: export ELEVEN_LABS=...  (or edit %s/.env)\n' "$DEST"
printf '   - Voiceover needs Whisper + Kokoro tooling via:  npx hyperframes  (transcribe/render)\n'
printf '   - Then ask Claude Code: "Create an explainer video about how HashMaps work"\n'
echo
