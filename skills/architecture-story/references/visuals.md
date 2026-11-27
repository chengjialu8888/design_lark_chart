# Chat and paired metrics · CLI 0.11.0

These optional fields are presentation data. Actor IDs, relations, prerequisites and full snapshots remain unchanged. New compact stories retain role icons by default; unstyled legacy inputs keep module appearance. See [visual-language.md](visual-language.md) for semantic icons, outlines, arrowheads and live legends.

## Chat and vector avatars

```json
{"id":"reply","kind":"message","label":"Mia · reply",
 "visual":{"variant":"chat","avatar":"person","side":"left","tone":"neutral","entrance":"pop"}}
```

Use the actor label for sender/event metadata and item lines for message content. Chat uses an 11px metadata line, 13px body, asymmetric corners and a 25px avatar outside the bubble. Reserve **31px** on the avatar side inside the stage and any containing group. The causal audit includes that outside lane in containment, overlap and route checks. Browser review still checks actual text and moving geometry.

`visual.variant`: `module`, `plain`, `chat` (chat requires kind `message`).
`visual.avatar`: `person`, `bot`, `branch`, `status`, `initials`, `none`. Avatars are bundled vector symbols or plain initials; no external image/network requests.
`avatarText`: required only for `initials`, 1–4 characters.
`side`: `left` or `right`, default left.
`tone`: `neutral`, `accent`, `success`, `warning`.
`entrance`: `fade` or `pop`, default fade. Optional visual actors fade in over 500ms; pop adds a small scale overshoot. The avatar enters with a 60ms delay over 300ms. Existing objects do not pop again on every state change.

For Router/worker-like processors use `variant: "plain"` with `avatar: "bot"` and the appropriate tone. Plain nodes omit category bands and metadata dividers; micro layouts use 11px titles without the icon to preserve fitting. An icon or color must never substitute for a declared business state.

Frame items for plain actors may use `visual: {"tone":"warning","badge":"Review"}` with a badge of **1–8 characters**. A badge sits on the top edge, 8 design pixels above the node; reserve that lane. Omitted frame fields reset to the actor's tone and remove the badge, including after backward jumps. Keep the original task in `lines` when a new message is rejected or returned; a presentation badge must follow declared facts rather than announce a receiver's result before delivery. The audit includes the badge's vertical extent. Browser review must check actual badge fitting and connector separation.

For a compact return scene, retain a visible warning return relation after arrival as an idle link; it communicates the completed direction without replaying a packet. Orange return paths use a stronger stroke. Set a canonical frame link's `label: ""` when its label is redundant in that frame. The canonical relation keeps its full label and causal contract; only the displayed label changes. Background actors should remain readable: explicitly include retained context in `focus`, then use item `opacity` to establish hierarchy. Check the final held frame as well as the moving handoff.

## Paired horizontal bars

Use a document actor and an item with empty lines:

```json
{"wide":[0.65,40,0.32,100],"narrow":[0.05,290,0.9,100],
 "lines":[],
 "metric":{"max":8,"legend":true,"duration":900,"delay":100,"stagger":80,"labelSpace":80,
  "series":[
   {"label":"Self-service","value":4,"display":"$4","tone":"success"},
   {"label":"Manual review","value":6,"display":"$6","tone":"warning"}
  ]}}
```

Exactly two series share `max`. Values must be finite, nonnegative and within a positive max. `display` is the explicit value label, allowing units and baseline-relative wording without invented counter values. `tone` uses the same four semantic colors. `legend` shows labels/swatches; enable it on the first pair when several comparable blocks share those labels.

`duration`: 100–5000ms (default 900); `delay`: 0–5000ms (default 0); `stagger`: 0–1000ms (default 80, between series). `labelSpace`: optional 24–160px; reserves a consistent value lane across multiple blocks, but never shrinks below the actual value text. For comparable visual lengths use the same labelSpace/slot width and normalize each pair appropriately. Different units do not share a numeric axis.

Bars grow from the left using finite smoothstep progress from the scene clock. Labels follow the bar ends and fade in; displayed numbers do not count up or pretend the entrance is a changing measurement. Reduced motion shows complete bars immediately. Pause freezes bars and avatars; navigation cancels previous progress; replay restarts it. A microframe with unchanged metric data continues growth; changed data starts a new presentation from that frame.

Keep animation within the scene's reading hold. Do not reset metrics between microframes unless the data changed. Metrics cannot also contain children or prose lines. Preserve source scope in notice/contract, especially for illustrative or unverified figures.

## Iterative checks

Inspect sender metadata, body wrapping, avatar lanes, category symbols, bar ratios and all value labels at wide/narrow widths. Capture entry/growth midpoints and settled states. Test pause during both animations, backward navigation, replay and reduced motion. Compare revisions at identical viewport and scene times; source timing differences must be reported.

Run both bundled verification scripts and browser-check `examples/support-comparison.json` plus a legacy example. Bad avatar fields and inconsistent metric scales must fail validation; don't add topic-specific rendering branches to bypass them.

With an optional `presentation.canvas`, these dimensions are design pixels. The browser scales bubbles, external avatars, chart labels and stroke widths together exactly once. Metric label measurement converts DOM width back to design pixels before reserving space. Chart progress survives resizing. `density:"compact"` changes only plain nodes: 11px title, 14px icon with 4px gap, 6px padding, 16px title/15px body lines; the size helper uses the same policy. It never hides wrapping text. Use `presentation.navigation:"pills"` for single-row reader questions and frame-link `transfer` with route `stops` for equal-time logical segments; see scene-format.
