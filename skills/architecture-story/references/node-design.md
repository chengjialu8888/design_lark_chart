# Node design and visual review

## Optional density choice · 0.10.0

Prefer narrow reflow for general architecture reading. When a user prioritizes matching a compact reference and accepts smaller diagram fonts, use an authored wide/narrow `presentation.canvas` and `density:"compact"` for plain processors. Keep complete message text and source facts; reserve 31 design pixels for chat avatars. Review real screenshots at the smallest actual viewport, all full snapshots and moving routes. A lower stage height is not a pass if text wraps outside slots, a payload crosses an unrelated actor, or controls shrink. Navigation and playback overlays stay unscaled with 44px touch targets.

This is the skill's internal design workflow. Use the bundled player and plain HTML, CSS and SVG. It works without a separate frontend-design skill, React Flow, n8n, a remote font or a component library. Do not automatically install tooling while following a visual reference.

## 1. Turn references into design decisions

Start with the user's screenshot, link and corrections. Inspect reference pages with available browser tools; load the host's browser-operation instructions first when required. Observe initial, active, waiting and completed states, plus an intermediate transition. A screenshot demonstrates appearance, not interaction.

Extract a few transferable decisions:

| Observation | Decision in this player |
| --- | --- |
| Short titles in compact workflow nodes | Fit surfaces to content; keep allocated layout slots separate from rendered size |
| Small leading icons and quiet metadata | Use actor kinds, one icon tile, a title and short secondary lines |
| Visible endpoints and clean route lanes | Show connected ports; route between actual actor bounds |
| One emphasized operation at a time | Use one primary focus and animate only the current causal transfer |
| Details revealed during playback | Split dense content into frames and expand a group only when explaining its contents |

Record what was observed and what was inferred. If a page is unavailable, use the supplied screenshot and report the missing interaction evidence. Reuse visual principles; do not copy branding, licensed assets, arbitrary business states or a reference application's editor controls.

Useful reference families include compact workflow nodes (React Flow and n8n) and restrained application typography (Linear and Notion). These are examples to inspect when useful, not dependencies or an instruction to browse every site.

## 2. Compose the node before styling it

Choose the actor kind from its actual role. Keep the title as a short object or operation name. Put a state or identifying value in one or two secondary lines; move explanations into the frame caption. Preserve essential content rather than hiding overflow or abbreviating a technical identifier beyond recognition.

Use the player's existing visual vocabulary:

| Element | Baseline |
| --- | --- |
| Ordinary node | Usually 132–210px wide, 48–90px high; actual content controls height |
| Width cap | 250px on wide canvases, 210px on narrow canvases |
| Title / annotation | 13px / 11px, normal weight |
| Leading icon | Existing 22px tile, with room for text beside it |
| Outline / corners | Thin neutral outline, 6–8px corners |
| State | Discreet mark plus a restrained accent; text or a symbol also communicates meaning |
| Expanded group | Light dashed boundary, authored size, contained children |
| Connection | Ports on connected sides, rounded orthogonal bends, reserved route space |

These are composition targets, not hard height limits. Long labels may wrap and increase height. Tiny reference tokens may use the player's micro layout. Containers are deliberately larger because they contain actors.

The pose defines a slot, not a demand to stretch the node. Reuse `fitNodeSize` from `runtime/scene-geometry.mjs`; do not add a second sizing policy. For an existing story, run `scripts/compact-story.mjs` to obtain a layout candidate, then inspect it. Fix spacing and content before changing shared geometry.

## 3. Make the composition readable

Align nodes by their centers in a shared row. Use consistent gaps and leave lanes for branch, return and waiting paths. Center a compact composition in the available stage; retain the player's quiet playback lane. Recompose a narrow frame when necessary instead of scaling every font down.

Show only actors that explain the current event. Reuse actor identity across scenes and reveal context progressively. Keep the caption outside the route area. Ordinary surfaces should not fill empty space simply because the canvas is wide.

For new diagrams use the compact preset with the [visual-language](visual-language.md): small role icons, state borders and brief badges, varied semantic arrows, a matching legend, quiet groups and retained objects. Mix plain/module/chat appearances when the meaning calls for them; chat is for conversations. Keep blue message and ownership paths, orange waiting, and green tool exchange. Avoid heavy shadows, oversized rounding and ornamental gradients. Hierarchy should remain clear when paused.

When a user supplies a conventional architecture diagram as a reference, use its module anatomy: a slim category color band, a compact title row, a separated metadata region, and a titled boundary around expanded children. Give ordinary nodes a subtle base shadow instead of inflating their size. Use actor kinds for category colors and retain explicit state marks; color alone must not assert a business fact. The bundled sizing policy reserves 6px for the metadata divider. If the user asks for light only, force a light color scheme in every delivered page, including the comparison, and omit the theme switch.

A visually attractive route must still express the correct relation. Waiting stops before the receiver and does not send a delivery packet. An icon, hover treatment or active border must never invent a source fact.

## 4. Use motion to explain a change

Keep a stable actor moving between contexts when the story follows the same object. Animate a packet only while a declared transfer occurs. Use a short observation pause after arrival or mutation so the viewer can read the resulting state.

Reuse the player's interpolation, pause handling and reduced-motion path. Do not add perpetual edge traffic, independent timers, pulsing on every actor or hover-driven causal changes. Expanded groups collapse with their existing identity; changes should remain understandable without motion.

Separate the question, causal action and reading hold. Keep captions stable through microframes; start the main action within roughly 3s, use 600–900ms transfers, then hold the result for 2.5–4s or longer for dense text. Pointer motion should ease between actor centers through the authored route, then show one arrival signal. Processing may breathe, but surrounding objects should settle. Static names remain visible; reveal changed body lines and captions only.

Use explicit focus to dampen unrelated context. Keep external participants and retained resources anchored when only internal work changes. Show the saved work and retained identity directly: a muted skipped operation and unchanged result can explain reuse better than an operation vanishing. Prefer an in-place fade for internal detail; reject arbitrary scaling from the container center. Verify these relationships during playback, not by counting animation features.

The bundled scene renderer progressively lights a flow route behind its packet, draws a short trail, and shows one arrival ring after the declared transfer duration. All three derive from the same elapsed story time. For slow motion, use the route-only soft profile in scene-format.md: spend the entire 1600–2200ms travel on the visible arrow, ease continuously instead of restarting at each segment, and reserve 650ms for a gentle arrival fade. Inspect frames at 16ms intervals around start, waypoint bends and delivery; reject abrupt opacity jumps and cutoff rings. Waiting has no beam, trail or arrival ring. Reduced motion keeps static route emphasis without transfer particles. Confirm that pausing freezes these accents, jumps replace them, and the arrival ring does not appear before delivery. Autoplay may demonstrate this once when requested; retain pause and explicit start under reduced motion.

Retain minimal playback controls, keyboard access and 44px touch targets. Do not add editor handles, a minimap, zoom controls or a configuration toolbar unless the requested product needs those interactions.

## 5. Critique the actual render, then repair it

Export the story with the bundled CLI. Run schema and causal checks, then inspect the rendered HTML in a browser. For renderer changes, also run `scripts/verify-player.mjs` and the interaction checks in `SKILL.md`.

Inspect at least the opening, busiest, longest-label, expanded-group and completion frames. Cover 736px and 320px widths, both operating-system color preferences with the default light canvas, and an intermediate transition. Exercise forward/backward navigation, a nonadjacent jump, pause/resume and the configured replay or loop boundary.

Record concrete observations:

- Is a short title surrounded by excessive empty space? Measure the rendered node, not just its slot.
- Are labels clipped, crowded beside icons, or difficult to read? Inspect actual wrapping and font size.
- Do connectors cross text, another actor or the caption? Check endpoints after content fitting and during movement.
- Can the viewer distinguish the active actor, surrounding context and waiting boundary while paused?
- Does the narrow frame preserve the same facts and readable hierarchy?
- Do pause, reduced motion and navigation cancel the prior animation correctly?

Repair the observed defect in the smallest applicable layer: caption/content, frame composition, route, or generic renderer. Re-export to a new filename and inspect the affected frames again. For a user-rejected design, retain a before/after view at the same viewport and playback state; compare size, spacing and hierarchy directly.

Shared renderer changes must remain domain-neutral and work with both bundled React and expense-approval patterns. A story-only layout correction does not require a new renderer feature.

Deliver the story and rendered result with a concise account of what changed and what was checked. If browser inspection is unavailable, mark visual acceptance as unverified; do not present CLI success as evidence of appearance.
