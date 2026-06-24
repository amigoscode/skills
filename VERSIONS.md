# Amigoscode Skills Versions

Current versions of all skills. Agents can compare against local versions to check for updates.

| Skill | Version | Last Updated | Summary |
|-------|---------|--------------|---------|
| infographic | 1.1.0 | 2026-06-23 | Generate branded "HOW X WORKS" educational infographic diagrams for backend/Java topics, exported as a final PNG plus caption. |
| carousel | 1.0.0 | 2026-06-23 | Generate branded LinkedIn carousel slides (PNGs), a combined PDF, beat-synced MP4s, a GIF, and platform captions for any tech topic. |
| explainer-video | 1.0.0 | 2026-06-24 | Produce a branded vertical explainer video (1080x1920 MP4) teaching one concept in ~40s: 8 animated scenes, ElevenLabs voiceover, word-by-word captions, synced sound effects, plus a LinkedIn caption. |
| x-card | 1.0.0 | 2026-06-23 | Generate a dark-mode X (Twitter) style quote card (1080x1350 PNG) with profile photo, blue tick, name, handle, and stats, plus a LinkedIn caption. |
| linkedin-poster | 1.0.0 | 2026-06-23 | Fully autonomous LinkedIn poster that publishes immediately or schedules text, carousel, or image posts via Playwright. |

## Recent Changes

### 2026-06-24
- Added `explainer-video` skill: branded vertical explainer videos (HyperFrames) with ElevenLabs voiceover, word-by-word captions, and synced sound effects

### 2026-06-23
- Initial version tracking added
- Added `infographic` skill for branded "HOW X WORKS" educational diagrams
- Added `carousel` skill for branded carousel slides, PDF, videos, and captions
- Added `linkedin-poster` skill for autonomous LinkedIn publishing and scheduling
- Renamed the repo to `amigoscode/skills`
- Renamed the `linkedin-carousel` skill to `carousel` (reinstall if you had the old name)
- Standardized skill output to `~/amigoscode-skills/<skill-name>/`
- Added `x-card` skill for dark-mode X (Twitter) style quote cards
