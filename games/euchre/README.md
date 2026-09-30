# Euchre

A partnership card game for one person and three computer players, built for review at [sghanna.github.io/ai/games/euchre/](https://sghanna.github.io/ai/games/euchre/).

Shawn requested a Euchre game in the style of Hearts, asked Codex to work with Antigravity, and authorized publishing this review version. It carries forward his requirements for readable cards, slow presses, modest finger drift, and changing a selection before confirming.

## At the table

You and Partner play against West and East. The first team to 10 points wins. Choose a bid or card, then press the large confirmation button. Every finished trick waits for you to continue; Menu pauses computer play. Last trick and the bidding history remain available for review.

This version uses 24 cards, two rounds of bidding, dealer pickup and discard, and optional lone hands for the player who calls trump. The first active player to the dealer's left leads. The left bower counts as trump when following suit. Makers earn 1 point for three or four tricks, 2 for five, or 4 for five alone; defenders earn 2 when they euchre the makers. There are no defender loners or extra penalties. “Dealer must choose” is on by default; Settings can allow a redeal for the next match.

Progress and selections save on this browser, with an earlier position retained for recovery. Load the game online once to prepare its offline copy. Safari's Share menu offers Add to Home Screen. Clearing website data clears progress. Settings control computer pace and bower labels. The computer uses simple heuristics and sees only its own hand and public play; it is not an expert opponent.

Rules references: [Bicycle](https://bicyclecards.com/how-to-play/euchre) and [Pagat's North American rules and variants](https://www.pagat.com/euchre/euchre.html#northam), consulted September 30, 2026. The choices above define this implementation where house rules vary.

## Source and checks

Canonical working source: `~/codex/euchre/`. Public deployment: `games/euchre/` in `sghanna/ai`. Keep the deployable files synchronized from the canonical source, and publish only when Shawn asks. The public review is release `ai-euchre-v1`.

```sh
npm ci
npm test
python3 -m http.server 8797 --bind 127.0.0.1
# In another terminal, with Playwright browsers installed:
npm run test:browser
```

The browser harness uses desktop WebKit and installed Chrome. `WEBKIT_PATH` can select an existing WebKit executable; `CHROME_CHANNEL` and `EUCHRE_URL` can select another Chrome channel or test URL. Screenshots, fixtures and results go in ignored `output/playwright/`. The build has no runtime packages or external fonts, advertisements, analytics, or account requirements.

Engine checks cover bowers in all four trump suits, legal follow-suit play, bidding restrictions, pickup/discard, lone-hand seat skipping, every scoring outcome, hidden-card isolation, save replay, and 300 complete deterministic matches. Browser checks cover 90 responsive game-state layouts, a complete match through the controls, saved selections, rotation, menus, keyboard input, touch cancellation and drift, storage recovery, and offline play. [Verification record](verification.json) records the completed checks.

These are automated desktop-browser checks. Physical iPhone/iPad use, Safari toolbars, home-screen installation, pinch zoom, VoiceOver, and the player's natural gestures still need hands-on review. Scrolling is available in constrained windows; controls retain their size.

## Collaboration and assets

AGY used Gemini 3.8 Flash High with high effort for the design and source review. Its recommendations shaped the visible bidding controls, persistent trump context, bower labels, and deliberate dealer discard. Codex implemented and integrated the game, corrected review findings, and performed browser and deployment checks. AGY and Claude's final source checks found no blockers to public review. Claude reviewed the rules, app, touch helper, worker and HTML; Codex performed the visual checks. Private review exchanges remain outside Git.

`deck.js` is the existing local SVG card renderer from the published Hearts game, originally adapted from AGY Solitaire; its provenance comment remains intact. `touch.js` is the released Hearts input helper. The two-jack icon is an original SVG created for this game. PNG install icons are raster exports of that source. No raster stock artwork is used.

Saved games use `ai-euchre-game-v1` and its `-backup`; settings use `ai-euchre-settings-v1`. The worker owns only caches beginning with `ai-euchre-`. Update the worker and matching asset query versions together when changing a cached release. An installed update waits for existing game tabs to close.
