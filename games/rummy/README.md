# Rummy

Classic two-player Rummy for review at [sghanna.github.io/ai/games/rummy/](https://sghanna.github.io/ai/games/rummy/). You play against a casual computer opponent with readable cards, deliberate moves, saved matches and offline support.

## At the table

Select the stock or the top discard, then confirm. Select cards for a set or run and press Lay set / run. To extend a meld, select your cards, select the table meld, then press Add. Select one card and press Discard to end your turn. Tap a selected card again to change your choice; Hint proposes a move without committing it.

The table keeps both scores, the opponent's card count and all melds visible. Hand cards remain fully exposed. On short screens, scroll to reach the hand and controls. Larger portrait tablets use wider five-card rows. Menu pauses the computer and offers Help, Settings, Last turn and New match.

## This version's rules

Each player receives ten cards from one 52-card deck. Make sets of three or four equal ranks, or runs of at least three consecutive cards of one suit. Aces are low; there are no jokers.

Draw once, optionally meld or add cards, then discard. Multiple melds per turn are allowed. Either player may extend any table meld without having first melded. Table cards cannot be rearranged. You may go out by melding or laying off your last card. The card just taken from the discard cannot be discarded that turn. A move cannot strand that card as your only card unless it can be added to a table meld.

Aces count 1, J/Q/K count 10, and other cards count their number. The winner earns the full value of the other player's remaining cards. There is no going-rummy bonus. The target is 100 points, with 200 available for the next match. The first dealer is random; the non-dealer starts and subsequent deals alternate.

An empty stock can be replenished twice by turning over all but the top discard without shuffling. After that, take the discard or select the empty stock and confirm End blocked hand. Forty consecutive turns without a table play also end the hand. The player with the lower remaining value earns the difference; ties score zero. These explicit house rules prevent endless exchanges.

Rules references, consulted September 30, 2026: [Pagat's Basic Rummy](https://www.pagat.com/rummy/rummy.html) and [Bicycle's Rummy](https://bicyclecards.com/how-to-play/rummy-rum). Help states the choices above where variants differ.

## Save and install

Moves and selections save in this browser, with a previous valid position retained for recovery. Load online once and wait for Offline ready. Safari's Share menu offers Add to Home Screen. Clearing website data removes saved progress. The game has no ads, analytics, account requirement, external fonts or runtime packages.

The computer uses simple heuristics and receives its own cards and visible table information only. Expert play is not claimed. Settings changes the computer's pace and the next match's score target.

## Source and verification

Canonical source: `~/codex/rummy/`. Public deployment: `games/rummy/` in `sghanna/ai`. Release cache: `ai-rummy-v1`.

```sh
npm ci
npm test
python3 -m http.server 8803 --bind 127.0.0.1
# In another terminal with Playwright browsers installed:
WEBKIT_PATH=/path/to/pw_run.sh npm run test:browser
```

The browser harness uses desktop WebKit and installed Google Chrome. `RUMMY_URL` selects another test URL. `TOUCH_ONLY=1` runs native touch and offline checks; `NO_TOUCH=1` runs the WebKit portion. The recorded local run used Playwright 1.64.0-alpha-1790635538000 with the existing WebKit installation.

Twelve engine test groups include 200 complete deterministic matches, card conservation, sets/runs, ace limits, discard restrictions, immediate wins, scoring, recycling, blocked hands, replay validation and hidden-hand boundaries. Browser checks cover 72 state/viewport combinations, a complete match through the visible controls, selection changes, reload/rotation, menus, keyboard input, settings, recovery and denied storage. Native Chrome checks use real 6.5-second holds and test button/card drift, large drags, cancellation, extra fingers, modal tap-through and offline play. Eight follow-up portrait-tablet renders verify the wider hand rows.

[Verification record](verification.json) records the results and runtime file hashes. Physical iPhone/iPad testing, Safari toolbars, home-screen installation, pinch zoom, VoiceOver and natural player gestures remain untested.

## Collaboration and assets

Shawn requested the game, selected AGY as collaborator, carried forward the established card-game requirements and requested publication for review. Codex implemented, integrated and tested it. AGY used Gemini 3.8 Flash High with high effort for design and source critique. Codex inspected the rendered screenshots; AGY's separate image review was unavailable. Claude's final check was attempted but could not run because of its weekly usage limit. No Claude review is claimed.

`deck.js` reuses the established Hearts/Euchre vector card faces, originally adapted from AGY Solitaire. Its unused deck constructor was removed; `engine.js` owns the deck. `touch.js` reuses the released Hearts input helper. The Rummy icon is an original SVG with opaque PNG exports. Review exchanges and test artifacts remain local and excluded from publication.

Saves use `ai-rummy-game-v1` and its `-backup`; preferences use `ai-rummy-settings-v1`. The worker owns only `ai-rummy-` caches in its directory scope. Bump the cache and asset URL versions together when changing cached files. Updates wait for existing game tabs to close.
