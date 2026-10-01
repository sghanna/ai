# Canasta

[Play the review build](https://sghanna.github.io/ai/games/canasta/).

Classic partnership Canasta for one person and three computer players. You and Partner play against West and East, with a 5,000-point match target. The first deal starts with you. There are no accounts, ads, external fonts or runtime packages.

Shawn asked Codex to work with AGY on a Canasta game like Hearts and publish it for review. The game carries forward his requirements for readable cards, slow presses, modest finger drift, and changing a selection before confirming.

## Playing

Draw a card, make any melds you want, then discard. Select matching cards and choose **Stage selected**. Stage several ranks together to meet your team's opening minimum, then **Confirm melds**. **Suggest melds** prepares an editable draft; it does not play the cards. Select one card and press **Discard selected** to finish your turn.

**Plan pile pickup** prepares a draft using the top discard. Add other melds if you need more opening points. **Take pile & meld** commits the draft and takes the rest of the pile. You can cancel before confirming.

Cards sort by rank and wrap at a readable size as your hand grows. The two teams' match scores, opening requirements and hand counts remain on the table. Melds show their size, wild count, and distance from a canasta. Phone layouts place the hand before the meld overview; tablets and wide screens show them side by side. Small screens can scroll. Menu pauses computer play and offers help, pace settings and recent history.

A match saves after each action; selections and unconfirmed drafts save too. A damaged save can recover the previous position. Load online once to prepare offline play. Use Safari's Share menu to add the game to your Home Screen. Clearing browser data clears progress. Updates wait for the existing game tabs to close.

## Rules used here

This is classic four-player Canasta, with two decks and four jokers, eleven cards each, one stock draw per turn, and shared team melds. It is not Modern American Canasta. The in-game help describes opening minimums, frozen piles, red and black threes, canastas, concealed exits, stock exhaustion and scoring.

The principal reference is [Pagat's classic Canasta](https://www.pagat.com/rummy/canasta.html#classic), checked September 30, 2026. Black threes block the next pickup but do not freeze the pile. We also use the one-card pickup restriction in [Bicycle's rules](https://bicyclecards.com/how-to-play/canasta): a one-card hand cannot take a one-card pile. Asking a partner's permission to go out is optional in classic rules; this version has no permission feature. A tied score at or above 5,000 continues for another hand.

Computer players use simple heuristics, their own cards and public table information. They do not inspect other players' hands or future stock cards. No expert-play claim is made.

## Verification

```sh
npm test
python3 -m http.server 8802 --bind 127.0.0.1
# In another terminal, with Playwright and its browsers installed:
CANASTA_URL=http://127.0.0.1:8802/ npm run test:browser
```

The browser harness imports the installed Playwright module; set `PLAYWRIGHT_MODULE` to its absolute path on another machine. It uses desktop WebKit and installed Google Chrome. Output goes in ignored `output/playwright/`.

- 13 engine test groups, including 200 complete simulated matches, card conservation, save replay, rule edge cases, and hidden-card isolation.
- 72 WebKit layout checks: eight game states across nine viewport sizes, including a legal large hand.
- A complete match through visible controls; selection and draft correction, reload, rotation, keyboard play, menus, results and damaged-save recovery.
- Native Chrome touch checks for long holds, upward action-button drift, cancelled gestures, extra fingers, card drags and duplicate clicks.
- Chrome offline reload with saved progress. Desktop WebKit's offline simulation failed with an internal browser error; it is recorded as unverified, not passed.

[Verification record](verification.json). These are automated desktop-browser checks. Physical iPhone/iPad use, Safari offline behavior, toolbars, home-screen installation, pinch gestures, VoiceOver, and ordinary play with the intended player remain to be reviewed.

## Collaboration and source

AGY used Gemini 3.8 Flash High for design and source review. Its design advice informed full-card wrapping, rank sorting, the visible draft and opening-point feedback. Codex implemented and integrated the game, tested it, and verified publication. AGY withdrew an incorrect concealed-scoring finding after checking the source evidence and approved the public review build. The attempted Claude check was unavailable because its weekly usage limit was exhausted; no Claude approval is claimed.

The touch helper comes from the existing Hearts game. Card faces use local typography and suit characters. The icon is an original SVG with local PNG exports. AGY's suggestions of blanket contrast/WCAG compliance are not adopted; browser tests do not establish accessibility for a particular person.

Canonical source: `~/codex/canasta/`. Public deployment: `games/canasta/` in `sghanna/ai`. Private collaboration records and the release checkout are excluded from Git. Saves use `ai-canasta-game-v1` and its backup; pace uses `ai-canasta-settings-v1`. The service worker only owns caches beginning `ai-canasta-`. Bump the worker and asset URL versions together when changing a published runtime.
