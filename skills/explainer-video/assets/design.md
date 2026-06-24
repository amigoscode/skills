# Design System: Stacks in Java Explainer (Amigoscode)

Vertical 1080x1920 explainer. Editorial, confident, dark-tech with a purple
brand accent. Ported from the original Claude Design composition.

## Fonts

- Display / body: **Epilogue** (weights 400, 500, 600, 700, 800, 900)
- Mono / code: **JetBrains Mono** (weights 400, 500, 600)

## Palette

| Token      | Hex        | Use                                  |
| ---------- | ---------- | ------------------------------------ |
| navy950    | #0b0e1c    | Deepest background, outro            |
| navy900    | #151a2d    | Dark scene background                |
| ink800     | #20273e    | Card surfaces on dark                |
| ink700     | #262c45    | Card surface alt                     |
| ink600     | #2e3551    | Card borders on dark                 |
| ink500     | #3f4768    | Muted text on light                  |
| ink400     | #5f6885    | Captions on light                    |
| ink300     | #8e96b3    | Secondary labels                     |
| ink200     | #bcc2d6    | Body text on dark                    |
| ink100     | #dde1ec    | Light borders                        |
| ink50      | #eef0f6    | Light fills                          |
| ink25      | #f7f8fb    | Lightest scene background            |
| white      | #ffffff    | Text on dark, light cards            |
| purple     | #7f56d9    | PRIMARY brand accent                 |
| purple700  | #5a37a6    | Deep purple text                     |
| purple600  | #6c44c4    | Gradient stop / text                 |
| purple400  | #9c80e5    | Accent on dark, arrows               |
| purple300  | #bda8f3    | Accent text on dark                  |
| purple200  | #d9ccff    | Soft purple border                   |
| purple100  | #ece4ff    | Soft purple fill                     |
| purple50   | #f5f1ff    | Lightest purple fill                 |
| green      | #12b76a    | Success / running                    |
| green600   | #039855    | Success text                         |
| greenSoft  | rgba(18,183,106,0.14) | Success chip bg           |
| red        | #f04438    | Error / crash                        |
| redSoft    | rgba(240,68,56,0.14)  | Error chip bg             |
| amber      | #f79009    | Warning                              |
| blue       | #2e90fa    | Info                                 |

Brand gradient: `linear-gradient(165deg,#8a63e0 0%,#6c44c4 100%)` (containers, control plane, pods).

## Corners & depth

- Cards: border-radius 18-24px. Chips/pills: 10-14px or 999 (full).
- Depth via layered purple shadows on brand elements:
  `0 28px 56px -16px rgba(127,86,217,0.5)`. Dark cards use soft dark shadows.

## Type scale (rendered at 1080x1920)

- Kicker: 28px, weight 700, uppercase, 0.2em tracking, purple
- Headline: 64-78px, weight 800, -0.025em tracking
- Caption (bottom): 41px, weight 500
- Card titles: 24-30px, weight 700-800
- Mono code/labels: 18-24px

## Avoid

- No web-UI opacity on brand purple. Use it at full presence.
- No full-screen linear gradients on dark (banding). Localized glows only.
- No fonts other than Epilogue + JetBrains Mono.
