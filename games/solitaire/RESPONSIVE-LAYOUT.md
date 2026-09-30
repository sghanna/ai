# Responsive iPad layout

September 30, 2026. Implemented locally in `solitaire/`; not published.

The game now uses the requested 600px and 900px breakpoints, larger tablet controls and dialogs, and a wider seven-column board. The manifest accepts either orientation and the service-worker cache is `agy-solitaire-v23`. The New, Menu, and Undo positions and original SVG card artwork are preserved.

The following dimensions are calculated from the CSS grid and checked through the JavaScript renderer with a simulated DOM. They are not browser measurements or device screenshots. Face-down spacing can compress in deep tablet columns.

| Viewport | Card width | Face-up spacing | Normal face-down spacing |
| --- | ---: | ---: | ---: |
| 390 x 844 | 49.1px | 32px | 12px |
| 768 x 1024 | 96.1px | 61px | 19px |
| 1024 x 768 | 129.1px | 82px | 24px |
| 834 x 1194 | 104.8px | 67px | 21px |
| 1194 x 834 | 137.1px | 88px | 24px |

## Preserve the Queen's tail

The proposed `0.48 * columnWidth` spacing and 28px compression minimum conflict with the requirement to expose the Queen's tail. In the existing 52 x 78 SVG, the Queen extends beyond y=32 and remains within y=33. Its clearance must grow with the card. The implementation therefore uses `max(32, ceil(columnWidth * 33 / 52))` as the minimum face-up spacing.

Tablet columns compress their face-down cards where needed. When a stack still cannot fit at readable size, the tableau scrolls above the bottom controls. Phone spacing remains 32px/12px at 390px width. Temporary card copies keep flights into a scrolling tableau above its clipping boundary. Rotation waits for a card flight to finish before rebuilding the layout and resizing the celebration canvas.

The auto-win banner's horizontal centering is retained during its drop animation and Reduced Motion path.

## Verification

Run from the repository root:

```sh
node --test solitaire/tests/responsive-layout.test.cjs
node --check solitaire/js/game.js
node --check solitaire/sw.js
git diff --check
```

All 12 renderer/state tests pass. They cover phone and tablet cascade spacing, waste fanning, unchanged game state, deep columns, clearing empty-column height, rotation debouncing, selection and halo preservation, waiting for animation completion, temporary-flight cleanup, and a conservative bound on the actual Queen SVG path. JavaScript syntax and diff checks pass. The manifest, v23 cache name, and every precache asset path were also checked.

Real-browser verification could not run in this session: binding a local HTTP server was denied, the Playwright wrapper could not reach npm, and direct launches of the installed WebKit and Chromium browsers failed. The tests above do not establish visual layout, console cleanliness, animation smoothness, touch behavior, or offline operation.

Remaining browser/device checks:

- Inspect 390 x 844, 768 x 1024, 1024 x 768, and 11-inch tablet portrait/landscape layouts. Check exposed Queens and bottom-control clearance in deep columns.
- Rotate with a selected stack, during a flight, and during each victory celebration. Confirm selection, scores, Undo, canvas size, and scrolling remain correct.
- Exercise stock draws, waste moves, tableau moves, Undo, New confirmation, Help, Settings, and auto-win. Inspect banner centering during motion and with Reduced Motion enabled.
- On physical iPhone and iPad, check deliberate taps, long holds, slight finger drift, cancellation, and duplicate activation. The existing game uses click/tap selection; no drag-and-drop handler was added.
- After serving over HTTP, confirm cache v23 installs and the game reloads offline.

## Portfolio follow-through

Shawn specified the iPad targets, phone baseline, separated controls, and Queen-tail constraint. Codex implemented the layout and regression checks, including the larger clearance required by the existing artwork. No outcome from Mom's use of this version has been observed.

The existing `accessible-card-games.md` portfolio case should receive this update after browser verification, with actual product screenshots labeled by viewport and capture date. Updating, rebuilding, and opening that portfolio was blocked here because `~/codex/portfolio/` is outside this session's writable roots. This note preserves the implementation and verification evidence for that follow-through.
