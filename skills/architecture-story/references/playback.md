# Playback options

## Pill navigation and design canvases · 0.10.0

`presentation.navigation:"pills"` keeps content-width buttons on one horizontally scrollable row. Each button has a 44px interaction height; current state uses both `aria-pressed` and `aria-current="step"`. Jump, automatic advance, replay and resize reveal the current button by scrolling only the navigation, without smooth-scroll timers or page movement. Menu/questions keep their previous behavior.

Optional `presentation.canvas` transforms only links, actors and focus geometry. Float controls and replay overlays remain in actual screen coordinates. Pause freezes segmented transfer, entrance, chart and node transitions through the existing clock/browser-animation handles; resizing never resets scene elapsed. With reduced motion, transfers stay static and metrics settle, but playback still requires explicit start.

Add the optional `playback` object at the top level of either schema.

| Option | Values | Default |
| --- | --- | --- |
| `mode` | `interactive` or `presentation` | `interactive` |
| `end` | `loop` or `replay` | `replay` |
| `selector` | Boolean; show reader-facing configuration selectors | `false` |
| `controls` | `minimal` or `full` | `minimal` |
| `autoplay` | Boolean; start when visible | `true` in presentation, otherwise `false` |

Use `presentation` for a self-running embedded demonstration. Use `interactive` for click-to-play exploration. Both use minimal controls by default: the canvas toggles playback, Space/Enter work when it has focus, and a small toolbar appears on hover or keyboard focus. Its menu expands/collapses step navigation and the full playback bar. Touch devices retain visible 44px control targets. Clicking a button, link, form control or selected text never also toggles the canvas.

Set `controls: "full"` to retain the permanently visible interactive navigation. `autoplay: false` disables automatic start independently of mode. `loop` restarts the entire story; `replay` holds the last frame under a compact replay overlay. Minimal interactive playback also reaches this overlay on completion.

Example for a clean looping embed:

```json
{"playback":{"mode":"presentation","controls":"minimal","autoplay":true,"end":"loop","selector":false}}
```

For a quiet click-to-play document illustration:

```json
{"playback":{"mode":"interactive","controls":"minimal","autoplay":false,"end":"replay","selector":false}}
```

For a visual A/B preview, set `selector: true`; otherwise configure the desired mode in the authoring data and omit the selector from the output. Switching to presentation restarts the whole story; switching to interactive pauses at the current scene. Changing end behavior restarts presentation so the preview is deterministic.

Visibility suspension resumes only presentation that was playing, never a manually paused story. A reduced-motion preference requires explicit start and suppresses visual transitions. Do not remove the remaining pause action merely to make looping autoplay look cleaner.

Verify the actual end boundary: observe a second full run for loop mode, or the overlay and a working restart for replay mode. Test switching back to interactive during playback; old timers must not keep advancing it. Same-config host echoes must not restart the current run.

The initial hint disappears after the first start. Pause stops progress and transitions; no decorative pulsing is added while paused. Active actors receive a thin accent outline, a discreet outer ring and a state mark. Compact icon tiles, connection ports, category color bands, separated title/body regions and titled group boundaries establish hierarchy on the default light canvas. Ordinary nodes fit their content instead of stretching across the canvas. Frame height follows the visible composition, except when authored loop or return route points require fixed coordinates. Orthogonal connectors have rounded bends while their endpoints follow moving nodes. Hover does not invent or alter a causal state.

Scene flows now light the traveled route behind a packet with a short trail. A single arrival ring appears only after the declared transfer completes, for at most 420ms before the next snapshot replaces it. These effects use the existing elapsed clock and freeze when paused. Waiting paths never show them; reduced motion removes particles and the arrival ring while retaining static path emphasis.

For scene schema v2, `presentation.navigation: "questions"` keeps the scene questions visible while leaving playback controls minimal. It does not change overview stories or the default menu. `presentation.motion: "pointer"` uses a dot and one arrival ring instead of transporting text; a link can override `motion`. `frame.processing` restricts border breathing to current work, while `frame.focus` controls contextual dimming. Pause includes caption and body reveals as well as the stage. Names do not fade again on startup or scene changes.

These are player expectations, not a guarantee from an embedding host. Visibility, saved state, reduced-motion preferences and sandbox behavior can affect startup. In an actual document, inspect the initial state and exercise Continue if paused. Verify mode switches there as well; do not claim autoplay or a restart from configuration alone. See [feishu-delivery.md](feishu-delivery.md) for document-specific acceptance and height constraints.
