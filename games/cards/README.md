# Card Games

[Play Hearts and Euchre](https://sghanna.github.io/ai/games/cards/) from one home, with saved progress and a shared offline download. In either game, choose Menu -> All games to switch. Wait for Ready offline before disconnecting. On iPhone or iPad, open the home in Safari and choose Share -> Add to Home Screen.

Release `905f8c95f726efb4`, September 30, 2026. [Release inventory and source provenance](release.json). The collection moved from `/ai/games/card-games/` at Shawn's request. Its original installation ID and saved-game keys remain unchanged; start URL, navigation scope and game routes use `/ai/games/cards/`.

The old home and game URLs redirect online after the old worker updates and open game tabs close. The old immutable files and offline fallback are retained. The new worker uses a separate cache prefix, so either installation can keep its offline files.

This two-game pilot uses separate practice progress from the standalone games. More games, portable backups and coordination between simultaneous tabs remain later work. Physical Home Screen installation, installed-app migration and natural touch gestures still need device testing.

The source and builder are maintained in the canonical `card-games/` project in Shawn's `sghanna/codex` workspace. Generated files contain the pinned Hearts and Euchre engines and 41 verified offline assets. Updates wait for open collection tabs to close. This release passed Chromium/WebKit switching, selections, recovery, offline and 18 layout checks, plus Chromium touch and worker lifecycle checks. Actual migration tests in both browsers confirmed waiting updates, exact saved selections, online redirects, offline fallback and original-cache preservation after a failed migration download.

Claude review is deferred until October 3 at 4 a.m. Pacific at Shawn's request. No automated review is scheduled here. The separately released Solitaire v24 worker limits cleanup to its own cache; existing Solitaire installations must reconnect to receive that fix.
