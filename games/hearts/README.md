# Hearts for iPhone and iPad

[Play Hearts](https://sghanna.github.io/ai/games/hearts/)

An ad-free Hearts game with readable cards, three computer opponents, English, Spanish, Vietnamese, saved progress, and offline play. There is no build step or runtime dependency.

This version brings the responsive Codex iPad game together with celebrations inspired by Claude Hearts. A match win sends up warm lanterns, shooting the moon gathers thirteen hearts and the queen of spades into a full moon, and a clean hand sends up five heart cards. Each scene fits the available screen, ends after a few seconds, and has a large **See scores** button. Reduced Motion shows the same artwork without movement.

The game preserves deliberate card selection and confirmation, optional one-tap play, slow presses with modest finger drift, automatic trick collection, and the three-second countdown when only one card is legal. Celebrations leave the cards, scoring, and saved result unchanged. They run when a hand finishes and do not replay after restoring a finished result. A whole-match win takes priority over a hand celebration.

## Play and install

Choose three cards and confirm the pass. Review the received cards, then start playing. Select a legal card and press **Play card**; change your selection first if needed. Lowest total wins once someone reaches 100 points; a tie for lowest continues the match.

Menu contains settings, rules, the last trick, and a guarded new-game action. On iPhone or iPad, open the game in Safari and use **Share → Add to Home Screen**. Load the game online once before using it offline.

This release has separate saves (`ai-hearts-game-v2` and its backup), preferences (`ai-hearts-settings-v2`), and cache (`ai-hearts-v1`). Progress in earlier Codex and Claude games stays at those versions; it is not imported here.

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

September 30, 2026 validation: 12 engine/insights tests (including 120 seeded matches), 43 celebration checks, 162 localized phone renders, and 239 tablet checks passed. Native Chromium quick-tap and 6.5-second hold/drift checks confirm that dismissing a scene preserves the result until a separate deliberate tap. The inherited browser suites also passed, including touch, recovery, responsive lifecycle, and offline loading. All 19 precached entries were available offline.

After changing cached assets, bump the worker cache version and the matching query strings in `index.html` and `manifest.json`. Publication requires Shawn's authorization and verification of the deployed assets.
