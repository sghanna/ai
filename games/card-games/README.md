# Card Games

[Play Hearts and Euchre](https://sghanna.github.io/ai/games/card-games/) from one home, with saved progress and a shared offline download. In either game, choose Menu -> All games to switch. Wait for Ready offline before disconnecting. On iPhone or iPad, open the home in Safari and choose Share -> Add to Home Screen.

This two-game pilot uses separate practice progress. Existing standalone games keep their own saves. More games, portable backups and coordination between simultaneous tabs remain later work. Physical Home Screen installation and natural touch gestures still need device testing.

Release `919b21624d8fcb33`, September 30, 2026. [Release inventory and source provenance](release.json). Generated from the canonical `card-games/` builder in Shawn's `sghanna/codex` workspace; the Hearts and Euchre engines retain their pinned source bytes. Each immutable release has 41 required files. One worker validates their hashes before reporting offline readiness and waits for open collection tabs to close before activating an update.

Chromium and desktop WebKit checks covered saved selections, game switching, recovery, offline first launches and 18 layouts. Chromium checks also covered slow touch release, modest drift, cancellation and keyboard activation. Five worker update/recovery scenarios passed. Independent Codex release review passed. Claude review is deferred until October 3 at 4 a.m. Pacific at Shawn's request; no automated review is scheduled here.

The prerequisite Solitaire v24 worker limits cleanup and cache lookup to its own files. An actual v23-to-v24 upgrade passed in Chromium and WebKit while preserving all collection cache entries and synthetic saved-data sentinels. Existing Solitaire installations must reconnect to receive that update.
