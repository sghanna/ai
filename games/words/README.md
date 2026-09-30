# Words / Word Wheel

An ad-free English word puzzle for iPhone, iPad and laptop browsers, with 1,000 levels, free hints and offline play.

[Play Words](https://sghanna.github.io/ai/games/words/)

Shawn Hanna directed the game. Claude built the original Word Wheel, including the iPad split layout Shawn selected on September 25, 2026. Codex reviewed and revised it on September 30; Antigravity (Gemini 3.8 Flash High) reviewed the responsive design plan. The original is preserved in [sghanna/claude](https://github.com/sghanna/claude/tree/39649e7/word-wheel).

## Play

- Swipe through letters and lift, or tap letters and press **Enter**. Each wheel tile can be used once per word. Slide back to remove the last letter.
- On a keyboard, type letters and press **Enter**. **Backspace** removes a letter; **Escape** clears the word. **Tab** reaches controls and individual wheel letters; **Space** activates them.
- **Shuffle** rearranges the wheel. **Hint** reveals a letter. **Pick a square** lets you choose which letter to reveal, with touch, mouse or keyboard.
- Find all grid words to finish a level. Other accepted words count as bonus words. Hints are unlimited; there are no timers, ads or purchases.

The interface supports English, Spanish and Vietnamese; puzzles remain English. Translations are AI-generated and still need native-speaker review.

## Screens and installation

The game uses one column on phones and portrait tablets, with larger controls where space permits. Landscape screens at least 700 CSS pixels wide use two columns. Narrow or very short windows can scroll instead of hiding the game. The layout responds to window resizing and rotation without clearing progress. Pinch zoom remains available.

For iPhone or iPad, open the game in Safari, choose **Share > Add to Home Screen**, then open it once while online. After its files finish caching, it can be played offline. The manifest permits both orientations. Real-device checks on iPhone and iPad, including Safari browser bars, pinch zoom, VoiceOver and Home Screen installation, remain necessary; desktop browser emulation does not prove those behaviors.

Saved progress stays on the device. The existing `claude-word-wheel-save` and settings keys are retained so a browser on the same `sghanna.github.io` origin can reuse its original progress. Separate browser profiles and Home Screen apps may have separate storage; there is no cloud synchronization. The new `ai-words-` cache prefix keeps this installation from deleting the original game's offline files.

## September 30 review

- Fixed a race that could label an unfinished level complete after leaving the previous level during its celebration.
- Added keyboard letter entry and accessible wheel buttons and hint squares.
- Kept keyboard focus inside dialogs and restored it to Menu or Help when closed.
- Restored the prior selection when a swipe is cancelled, interrupted or joined by another finger. Large returning button drags cancel; slow presses and modest button drift still activate once.
- Removed the landscape blocking screen, added compact two-column spacing, and fixed clipped level labels on narrow phones.
- Preserved the original puzzles, felt palette, chosen iPad layout and save format.

See [REVIEW.md](REVIEW.md) for verification and remaining limits.

## Run and check

From this directory:

```sh
npm ci
npx playwright install webkit chromium
python3 -m http.server 8774 --bind 127.0.0.1
```

In another terminal:

```sh
npm test
npm run test:review
npm run test:ui
node tools/safari15-check.mjs
```

Browser tests default to `http://127.0.0.1:8774/`; pass another base URL as the script's first argument. They use separate test storage for puzzle fixtures. The offline check uses a fresh browser profile. Screenshots go to ignored `output/playwright/` or `tests/shots/`.

The Safari check is a static compatibility heuristic. It cannot substitute for testing an older iPad.

Local canonical source: `~/codex/words/`. GitHub release: `sghanna/ai`, `games/words/`. Bump the version in `sw.js` and the asset query versions in `index.html` whenever cached assets change.

## Word sources

Grid answers and bonus words come from SCOWL, filtered with LDNOOBW and the original editorial exclusions. The levels and vocabulary were preserved in this review. See [tools/WORDS.md](tools/WORDS.md), [SCOWL permission notice](tools/sources/SCOWL-Copyright) and [editorial exclusions](tools/removed-words.txt).
