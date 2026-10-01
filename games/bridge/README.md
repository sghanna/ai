# Bridge

A single-player Bridge game built for review at [sghanna.github.io/ai/games/bridge/](https://sghanna.github.io/ai/games/bridge/). You play South with North as your partner against West and East.

Shawn requested Bridge in the style of Hearts, with AGY collaboration and publication for review. The game carries forward his requirements for readable cards, slow presses, modest finger drift and changing a selection before confirming.

## Play a session

Bid with the level controls and a suit or No trump, or select Pass, Double or Redouble. The gold button confirms your choice. Invalid calls are unavailable. The four seats show each player's last call; Auction opens the full history.

The first player on the winning side to bid the final strain becomes declarer. Their partner is dummy. The opening lead comes from declarer's left and reveals dummy. Follow suit whenever possible. The highest trump wins, or the highest card in the led suit when no trump is played. The winner leads next. Completed tricks wait for Next trick.

This is a practice game: when North-South declares, you control both hands, including when South is dummy. North's hand becomes visible after the opening lead. When defending, you control South only. Labels and a blue hand area identify where to play. You may change a selected card before confirming.

The default session has four boards; Settings offers eight or sixteen for the next session. Each board uses duplicate contract scoring and the standard dealer/vulnerability cycle. The totals are raw points, with the higher-scoring side finishing ahead; there is no matchpoint/IMP comparison, rubber scoring or tournament ranking. Ties remain tied. Passed-out boards score zero and count toward the session.

Scoring includes minor/major/No trump trick values, partscore and game bonuses, small and grand slams, overtricks, undertricks, doubles and redoubles. Help explains the system and each result shows its breakdown. References: [ACBL basics and scoring](https://www.acbl.org/learn/) and [Laws of Duplicate Bridge, Law 77](https://web2.acbl.org/documentlibrary/play/Laws-of-Duplicate-Bridge.pdf), consulted September 30, 2026.

## Computer players

The computers use a small natural bidding heuristic, not a complete standard bidding system: 12+ HCP openings, five-card majors, longer minors, balanced 15-17 HCP 1NT and 20+ HCP 2NT, basic raises and natural responses. They do not use conventions or initiate doubles/redoubles. The human may double and redouble legally. Bots see their own cards, auction and public play; a computer declarer also sees revealed dummy. They do not inspect defenders' hands. Expert bidding or play is not claimed.

## Save, install and accessibility

The game saves the action history and current selection in this browser. Restores replay the rules; an earlier saved position is retained for recovery. Menu pauses computer players. Settings can change their pace. Load online once for the offline copy, then use Safari's Share menu to Add to Home Screen. Clearing website data removes progress.

The interface supports mouse, keyboard and release-based touch without a short hold deadline. Large buttons tolerate up to 32 CSS pixels of movement with a 24-pixel edge allowance. Cards have tighter 12-pixel movement bounds, including dummy cards. Interrupted gestures, extra fingers and repeated activation are guarded. Pinch zoom remains enabled. Small screens scroll to retain readable cards and controls. No ads, accounts, analytics, remote fonts or runtime libraries are used.

## Source and verification

Canonical source: `~/codex/bridge/`. Public release: `games/bridge/` in `sghanna/ai`.

```sh
npm ci
npm test
python3 -m http.server 8801 --bind 127.0.0.1
# In another terminal, with Playwright WebKit and Google Chrome installed:
npm run test:browser
```

`BRIDGE_URL` selects a different preview URL. `LAYOUT_ONLY=1` runs the responsive layout checks; `TOUCH_ONLY=1` runs native touch and offline checks. Browser artifacts are kept in ignored `output/playwright/`.

Eight engine test groups cover auction legality and termination, dealer/vulnerability rotation, declarer selection, dummy timing, follow suit, trump/No trump, known scoring examples, hidden-information boundaries and replay validation. Two hundred complete simulated sessions cover 800 boards. Browser verification covers 162 state/viewport combinations, a four-board session through visible controls, correction/reload/rotation, settings, focus, recovery, duplicate activation and offline loading. Native Chromium checks cover 6.5-second holds, drift, cancellation and extra fingers on both human-controlled hands. See [verification.json](verification.json).

These are desktop browser checks. Physical iPhone/iPad play, Safari toolbar changes, pinch gestures, VoiceOver and home-screen installation remain untested. No measured usability improvement is claimed.

## Collaboration and assets

Shawn directed the product, carried forward the interaction requirements, selected AGY as collaborator and authorized review publication. AGY used Gemini 3.8 Flash High with high effort for design advice and source critique. Codex implemented, integrated, tested and published the game. AGY withdrew unsupported rule concerns after evidence was checked and reported no remaining engine blockers. A keyboard-focus fallback was added and tested. Claude's extra review remains pending: its first attempt timed out and the retry hit its weekly usage limit. Review exchanges stay private; verification.json records that limitation.

The card renderer comes from the established Hearts/Spades renderer, originally adapted from AGY Solitaire. The touch helper is adapted from the released Hearts input helper, with the same card movement limits applied to dummy. Table and menu styling build on the existing games. The Bridge icon is an original SVG with opaque installation PNGs.

Saves use `ai-bridge-game-v1` and `-backup`; settings use `ai-bridge-settings-v1`. The service worker owns only `ai-bridge-` caches in this game's directory. Its first release uses `ai-bridge-v1` with `bridge-v1` asset URLs. Future runtime releases must bump both. Updates wait for existing game tabs to close.
