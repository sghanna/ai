# Card Games has moved

[Open Card Games](https://sghanna.github.io/ai/games/cards/) at its new `/ai/games/cards/` address. Home, Hearts and Euchre links from this folder redirect to the matching new page.

The original immutable release is retained for existing offline installations. An updated worker waits for open old game tabs to close, then uses the redirect online and the original cached game when disconnected. Saved-game keys and the original installation ID are unchanged. Installed apps must reconnect to receive the update. Physical Home Screen migration remains untested.

[Current release and checks](../cards/README.md). The original release inventory remains in [release.json](release.json); it describes the retained immutable files and the original worker, before this redirect update.
