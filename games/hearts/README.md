# Hearts for iPhone and iPad

[Play Hearts](https://sghanna.github.io/ai/games/hearts/) · [Replay the celebrations](https://sghanna.github.io/ai/previews/hearts-celebrations/)

September 30 update: the queen spins twice and slows into a clean flip that reveals the moon, and each win gets a fresh mix of lantern sizes and rising speeds. This release uses cache `ai-hearts-v7`. The preview page replays all three animations without changing a saved game.

An ad-free Hearts game with readable cards, three computer opponents, English, Spanish, Vietnamese, saved progress, and offline play. There is no build step or runtime dependency.

This version brings the responsive Codex iPad game together with celebrations inspired by Claude Hearts. A match win sends up warm lanterns, and a clean hand sends up five heart cards. For shooting the moon, a large queen of spades flips to reveal the moon; thirteen larger hearts spiral in and build the crimson heart in the gold-seal favicon. Each scene fits the available screen and has a large **See scores** button. The revised moon sequence lasts about eight seconds, including a pause on the finished logo. Reduced Motion shows still artwork, with the completed logo for shooting the moon.

The game preserves deliberate card selection and confirmation, optional one-tap play, slow presses with modest finger drift, automatic trick collection, and the three-second countdown when only one card is legal. Celebrations leave the cards, scoring, and saved result unchanged. They run when a hand finishes and do not replay after restoring a finished result. A whole-match win takes priority over a hand celebration.

## Play and install

Choose three cards and confirm the pass. Review the received cards, then start playing. Select a legal card and press **Play card**; change your selection first if needed. Lowest total wins once someone reaches 100 points; a tie for lowest continues the match.

Menu contains settings, rules, the last trick, and a guarded new-game action. On iPhone or iPad, open the game in Safari and use **Share → Add to Home Screen**. Load the game online once before using it offline.

This version has separate saves (`ai-hearts-game-v2` and its backup), preferences (`ai-hearts-settings-v2`), and cache (`ai-hearts-v7`). Progress in earlier Codex and Claude games stays at those versions; it is not imported here.

## Sources and credit

Shawn Hanna directed the game, accessibility requirements, source combination, and publication. Codex implemented this local adaptation.

- Game base: [`sghanna/codex`, `hearts-ipad/`, commit `4ff77a0`](https://github.com/sghanna/codex/tree/4ff77a016727f78c160663e7374cf4cde7799abd/hearts-ipad).
- Celebration reference and adapted lantern/moon artwork: [`sghanna/claude`, `hearts/fx.js`, commit `d6b331f`](https://github.com/sghanna/claude/blob/d6b331fd488c3e7ebdac173eea252f1da0ffcd39/hearts/fx.js).
- Vector cards retain their existing attribution to `agy-solitaire/js/deck.js` in `deck.js`.

## Development and checks

Serve the repository root with `python3 -m http.server 8767 --bind 127.0.0.1`, then open `http://127.0.0.1:8767/games/hearts/`.

```sh
cd games/hearts
npm ci
npx playwright install chromium webkit
npm test
npm run test:celebrations
npm run test:ipad
npm run test:browser
```

Set `HEARTS_URL` for another server or deployed URL. `PLAYWRIGHT_MODULE` can point to an existing Playwright module; `CHROME_PATH` can select a local Chrome executable. Reports and screenshots go in ignored `.artifacts/`.

The celebration suite checks actual final-trick triggers, unchanged scores, restore behavior, false victories, three languages, portrait and landscape phone/tablet layouts, Reduced Motion, dismissal, backgrounding, rotation, and starting another game. The inherited suites cover the engine, touch input, responsive layouts, save recovery, and offline use.

Desktop WebKit and Chromium checks supplement physical testing. This release still needs a hands-on playtest on iPhone, iPad Air 2, and iPad mini 5, including Safari toolbars, installation, pinch zoom, and Mom's natural touch gestures.

Initial combined-release validation, September 30, 2026: 12 engine/insights tests (including 120 seeded matches), 43 celebration checks, 162 localized phone renders, and 239 tablet checks passed. Native Chromium quick-tap and 6.5-second hold/drift checks confirm that dismissing a scene preserves the result until a separate deliberate tap. The inherited browser suites also passed, including touch, recovery, responsive lifecycle, and offline loading. All 19 precached entries were available offline.

The moon revision passed the 43 celebration checks again, plus inspection of seven sequence stages at three phone/tablet sizes. The checks verify the queen of spades artwork, thirteen larger hearts, progressive logo assembly, natural completion, Reduced Motion, all preview buttons, and no preview storage writes. The updated offline cache also passed.

After changing cached assets, bump the worker cache version and the matching query strings in `index.html` and `manifest.json`. Publication requires Shawn's authorization and verification of the deployed assets.

The spin and lantern update passed all 43 celebration checks, eleven moon-sequence stages at three sizes, and lantern checks for varied sizes and speeds, fresh replays, completion timing, and stable Reduced Motion. Desktop Chromium loaded the updated cache offline with 19 entries. Claude review remains deferred at Shawn's request.

Shawn asked for AGY's help after the spin and transition still felt awkward. Gemini 3.8 Flash High suggested matching the card and moon at their narrow edge, avoiding a transparent overlap. Codex corrected the proposed timing and implemented two turns over 1.56 seconds, slowing into the flip. The moon opens immediately over the next 0.3 seconds; hearts start 0.12 seconds later. After Shawn approved the motion design, he asked for a slightly slower spin; this timing reduces its angular speed by about 20%. A 2D projection avoids an observed WebKit discrepancy between the computed edge and its rendered image. The exact logo and 8.2-second scene duration remain.

AGY reviewed the design and revised code. Its interactive browser tools were unavailable, so Codex performed the rendered checks. The sequence suite verifies an immediate spin, two turns, progressive slowdown, the opaque handoff, complete logo assembly, Reduced Motion, and cleanup at three phone/tablet sizes. Shawn approved the refined animation and authorized publication. Physical-device playtesting remains necessary.
