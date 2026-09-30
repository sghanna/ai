# Words review - September 30, 2026

The review used Claude's Word Wheel at commit `39649e7`, which already includes Shawn's selected iPad split layout. No separate `words-ipad` game was found; `options-ipad.html` contains the earlier layout comparison.

## Reproduced defects and changes

| Before | Change | Verification |
| --- | --- | --- |
| Leaving a level during its celebration could show the next, unfinished level as complete. | Associate asynchronous completion with the level that started it; ignore obsolete work. | Start a new level while the previous celebration is pending; verify no results panel and continued play. |
| Typing letters did nothing; wheel letters were hidden from assistive technology. | Native letter buttons, keyboard word entry and keyboard-operable hint squares. | Complete a puzzle using the keyboard and advance; exercise letter and hint controls. |
| Changing levels at 2x zoom could leave the previous board visible. | Skip zoom-driven resize only, while always rebuilding for a new level. | Chromium page-scale emulation; advance to a puzzle with different letters and check all wheel positions. |
| Enter on a hint square could also submit the word in progress. | Stop the global keyboard handler when the square has handled the event. | Reveal a square with CAT in the strip and verify CAT stays unsubmitted. |
| Tab escaped the open menu. | Explicit forward/backward focus cycling and focus restoration. | Cycle through the menu repeatedly in WebKit and Chromium; ensure typing cannot alter the game behind it. |
| A cancelled swipe left letters selected. | Restore the selection from before the gesture; cancel multi-pointer and backgrounded gestures. | Cancel partway through a swipe and add a second finger; check state and reload. |
| A long button drag returning to the starting point could activate. | Track the greatest movement during the press. | Check a returning 130px drag and a slow press with 30px upward drift. |
| A 320px screen clipped `Level 400` to `Level 4`. | Give label space back by removing decorative icons at narrow widths. | Check level 1000 in all three interface languages. |
| Phone landscape and short laptop windows were covered by a rotate screen. | Compact two-column landscape layout; scrollable fallback below its width/height limits. | Check 17 viewport sizes in two browser engines. |
| Copying the old service-worker cache prefix would let the two games delete each other's offline files. | Use a separate `ai-words-` cache namespace and limit cached requests to its scope. | Keep an original-game cache while loading and playing the new game offline. |

Antigravity reviewed the proposed layout changes using supplied measurements. Its first request timed out; the shorter review returned recommendations about short Safari windows, focus rings and zoom. Codex retained 18px-or-larger control text rather than adopting its smaller suggested header type. The wheel keeps single-finger swipe handling while allowing pinch zoom. Antigravity's response is design review, not evidence of a physical-device test.

## Checks

- All 1,000 level definitions pass the original independent dictionary and grid checks.
- 212 review checks pass across desktop WebKit and Chromium, including offline reload and play.
- All 2,098 checks in the original WebKit UI suite pass, including swipes, hints, save recovery, language layouts, tablet rotation and startup failures. The four warnings about empty grids skip only a filled-letter font-ratio measurement in pick-mode rotation fixtures; the layout and state checks run.
- Static Safari 15 check passes, with the original focus-visible and overscroll-behavior compatibility warnings.
- Actual WebKit screenshots were inspected at 390x844, 844x390, 768x1024, 1024x768 and 1366x768.

Claude's independent review reproduced the zoom and hint-keyboard issues in the initial revision. Both were corrected before release and covered by new tests. A final refinement retains the unzoomed board height when a browser reports reduced dimensions during pinch zoom. Claude approved the final runtime and independently reran all 212 regression checks. Reintroducing each of the two earlier bugs caused its regression check to fail. The original suite's dialog helper was updated to target visible close buttons, and its failed-script fixtures now match versioned asset URLs.

## Remaining checks

Rotating while already zoomed can retain the earlier board dimensions until zooming out.

Use real iPhone and iPad devices to check slow presses, finger drift, pinch zoom, dynamic Safari bars, rotation, VoiceOver and Home Screen installation. Test Spanish and Vietnamese wording with native speakers. Very small windows use scrolling, and the smallest portrait phones still have smaller grid squares than larger phones. No new user playtest, usability improvement measurement or universal accessibility claim is made.
