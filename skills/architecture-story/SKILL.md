---
name: architecture-story
description: Generates animated architecture and business-process walkthroughs from code, documents, or explicit design assumptions using the bundled offline CLI. Offers directly selectable compact, module and sequence styles with visual examples. Supports in-diagram motion, synchronized before/after comparisons, source and causal verification, and authorized document delivery. Applies when users request animated workflow explanations, architecture stories, style selection, or revisions to their motion and presentation.
metadata:
  version: "0.15.0"
---

# Architecture Story

Turn one concrete workflow into an inspectable, step-through explanation. Author story data; reuse the player rather than rewriting an animation engine.

## Runtime

Skill and bundled CLI are 0.15.0. New stories use the reference compact composition by default: small semantic icons, content-sized nodes, layered state borders, quiet groups and persistent objects. Compact does not mean removing detail. Three presets are available: `compact`, `module`, `sequence`. Preset defaults resolve before audit and rendering; explicit appearances take precedence. Unstyled legacy JSON keeps its original behavior. Live relationship legends, open/filled/diamond arrowheads, dashed/dotted outlines and state badges complement causal motion, optional chat/metrics, design canvases and pause.

Requires Node.js 20+. The distributed skill includes a pinned CLI under `runtime/`: prefer `node <skill-root>/runtime/story.mjs --version` and substitute that entrypoint for `architecture-story` in commands below. It runs offline without global installation. If using an installed CLI instead, check `architecture-story --version` is 0.15.0; do not silently mix versions. In a source checkout, `node /absolute/path/to/story.mjs` is equivalent. Do not download a same-named public npm package; use the provided runtime or approved local archive. Global installation remains a separate user-authorized action.

## Choose a style

Accept the user's Chinese name or stable ID directly:

| User choice | Persisted ID | Composition template |
| --- | --- | --- |
| 示例紧凑风 | `compact` | [examples/style-compact.json](examples/style-compact.json) |
| 架构模块风 | `module` | [examples/style-module.json](examples/style-module.json) |
| 调用时序风 | `sequence` | [examples/style-sequence.json](examples/style-sequence.json) |

For example, “用调用时序风画这条 RPC 链路” selects `sequence`. Read [references/styles.md](references/styles.md) and the corresponding template before composing. Persist the ID in `presentation.style` in the delivered story JSON. Keep the selected style on subsequent revisions unless the user changes it; `newStory(spec)` preserves an existing choice.

When the user asks to see or choose styles without naming one, present the bundled [style gallery](examples/style-gallery.html) first. It previews all three and provides “采用此风格” to reveal a copyable request and download the corresponding illustrative JSON. If the host supports structured choices, offer these three labels once. In other hosts, the gallery's copyable request works directly. A local HTML page cannot send a choice back to the agent automatically; read the user's returned request or downloaded `presentation.style`. If the task already has a chosen style or asks for immediate generation, continue without a selection checkpoint. Use `compact` for new stories with no preference.

The examples supply reusable visual composition, not source evidence. Replace their actors, facts, captions and timings with inspected business content. For an existing story, `select input.json selected.json --style "架构模块风"` saves only the choice into a new JSON; inspect and adapt poses to the selected composition before export. Explicit visuals remain intentional overrides.

Choose the presentation before authoring:

- Read [references/styles.md](references/styles.md). Write `presentation.style: "compact"` for new scene stories unless the user selects another style. To compare presets, run `node <skill-root>/scripts/generate-style-gallery.mjs <existing-output-directory>`. A style selects defaults and authoring rules; it does not automatically rearrange arbitrary poses.
- For a continuous walkthrough inside a diagram, use schema v2 and read [references/scene-format.md](references/scene-format.md). Follow one stable actor (request, task, record); use frame timing for progressive disclosure and causal action, with readable pauses after meaningful results.
- For a persistent architecture overview with highlighted paths, use schema v1 and read [references/story-format.md](references/story-format.md).

For new scene stories, also read [references/semantic-contract.md](references/semantic-contract.md). Use canonical relations and a causal contract. The CLI checks declared prerequisites, transfer timing, independent contexts, container bounds and routing obstacles; it does not verify source truth or guarantee browser text fitting.

For new diagrams or visual refinements, read [references/node-design.md](references/node-design.md) before authoring layout. It bundles reference analysis, compact node composition, restrained motion and browser critique into this skill. Apply it with the existing HTML/SVG runtime; no separate design skill or component-library installation is required. Reference sites inform visual choices, not business semantics.

For every new scene, read [references/visual-language.md](references/visual-language.md): choose icons by role, mix node surfaces where their meaning differs, assign relationship styles and preserve short state badges. Compact services keep role icons by default. Let live legends explain line conventions without duplicating every edge label. For conversations or numeric comparisons, also read [references/visuals.md](references/visuals.md); chat and paired metrics remain optional.

For autoplay, looping, hidden menus or video-like replay overlays, read [references/playback.md](references/playback.md). These are playback options shared by both schemas, not a different story format. Keep the mode selector out of the published diagram unless the user wants readers to switch modes.

For before/after comparisons, also read [references/comparison.md](references/comparison.md): align inputs and events, and express the difference through object identity, mutation and ownership.

For insertion into a Feishu document, read [references/feishu-delivery.md](references/feishu-delivery.md). This is a separate, user-authorized delivery step; validate the actual embedded player and preserve unrelated document content.

## Authoring

- Avoid unnecessary secondary labels and descriptions. Let the layout do the explaining. Use position, grouping, alignment and progressive disclosure to show structure. Remove labels that only repeat the title, actor name, caption or an already clear relationship; retain facts needed to understand ownership, waiting, alternatives, source status and implementation boundaries.
- Establish whether the user wants the current implementation, a proposed architecture, or an illustrative mechanism. For current behavior, inspect relevant code and record the source revision and paths in the accompanying explanation. Mark proposals and illustrative data visibly in `notice`.
- Before drawing, write a small evidence table: claim → inspected source location → representation → assertion. Include message ownership, sender/receiver, acknowledgement, waiting boundary, who initiates a branch, and what ends a round/task. Unverified links remain visibly proposed or are omitted; never invent a dispatcher to fill an empty space. For animated references, inspect intermediate states, not just a final screenshot. If access is blocked, report the gap rather than claiming source alignment.
- Pick a concrete request and follow its causal path. Each step should answer who receives what, what changes, and what happens next. Keep one main visual and a short caption. Do not turn background context into extra panels.
- Separate reading beats from microframes. Keep a caption unchanged across the transfers that explain one claim. Aim for the first main action within 3s, then 2.5–4s to read the result; give longer captions more time. Ordinary transfers can use 600–900ms. When the reader reports flashing or excessive speed, prefer 1600–2200ms, `transfer: {timing:"continuous",scope:"route",effect:"soft",easing:[.35,0,.65,1]}`, and at least 650ms after travel for arrival to fade before the next frame. Use `scripts/slow-transfers.mjs source.json new-story.json` to retime canonical transfers while preserving final reading holds and causal snapshots. Avoid one subtitle per action and long empty processing waits. Run `scripts/check-presentation.mjs` to flag pacing problems, then watch actual playback.
- Use `presentation.navigation: "questions"` for a few reader questions and `presentation.motion: "pointer"` for a dot that travels through ports to a receiver center and signals arrival. Keep object names readable from the opening; animate only changed body lines and captions. Use `frame.focus` to dim unrelated actors and `frame.processing` to breathe only on current work. Focus is presentation, not proof of a business state.
- Use `scene.layout: "stable"` and `scene.anchors` when unchanged object positions explain retention or reuse. Keep retained identity and skipped work visible where they matter: a muted operation with a short skip reason often explains savings better than removing it. Do not move external callers when internal work expands. Choose dashed, dotted, neutral or accent paths from relation meaning, not decorative variety.
- In scene mode, prefer one persistent composed diagram with progressive frames. Aggregate the normal path, error isolation and retry on the same map. Split only when ownership or layout genuinely becomes ambiguous. Alternative runs may reset facts at a frame with an explicit `branchReason`; label the alternative visibly and preserve the complete snapshot. Keep ordinary causal progress monotonic. Define readable wide and narrow poses; leave room for connectors and wrapping text. Each frame is a full snapshot.
- Expand a group with `contains`, then collapse the same actor by omitting its children. Empty `contains: []` preserves a boundary. Children enter/exit in place with a short fade; avoid flying text from the group center. Show connection semantics (`message`, `call`, `return`, `ownership`, `dependency`) explicitly. Waiting ends with a stop mark, not a delivery packet. Use `resetFacts` with a reason only for a genuine alternative, not to silence a failed check.
- Use restrained neutral structure, a single active focus, blue message/ownership paths, orange waiting and green tool exchange. Default to narrow reflow and readable type. If the user explicitly prioritizes reference density, choose `presentation.canvas` to scale the authored design, explaining that diagram fonts shrink with it. Keep captions and touch controls outside that canvas, check the smallest viewport, and never clip content to reach a height target. Reserve route lanes. Put deliberate observation pauses after meaningful changes. Avoid perpetual motion on every edge.
- Use the built-in refined canvas and minimal playback controls by default. Click the canvas to play/pause; open the small menu for step navigation. Preserve keyboard, touch and reduced-motion paths. Do not add a second toolbar or a configuration selector to a published diagram.
- Use the bundled compact preset by default, matching the vocabulary of `index-0.12.html`: role icons, neutral compact nodes, selected chat or module surfaces, quiet ownership containers, state borders and short badges. Preserve structural detail while reducing size. Choose line patterns, colors and arrowheads by relation meaning; add a small legend when readers must distinguish them. Reserve chat for actual conversations. Keep source details in the header disclosure; proposed or illustrative scenes retain a visible “方案说明” label. Icons and decorative accents never prove a business fact.
- For a requested visual preview, use `playback: {"mode":"interactive","controls":"minimal","autoplay":true,"end":"replay","selector":false}` to demonstrate once with pause available. Respect explicit manual-play requests. Reduced motion still requires explicit start and removes transfer particles. Keep the delivered canvas light even under a dark operating-system preference; do not add a theme switch unless requested.
- Size ordinary nodes around their actual title and short lines, usually 100–180px wide and 48–90px high for compact; module cards may need more space. Compact uses 11px node text; captions and controls stay outside the scaled canvas. Long content wraps and may require more height. Expanded groups retain their authored width. For an existing scene story, `node <skill-root>/scripts/compact-story.mjs source.json new-compact.json` rewrites slots using the shared size policy. Review routes and text in a browser; it is a layout aid, not proof of fit.
- Center compact compositions in their available canvas, leaving a quiet playback lane below the nodes. The runtime fits canvas height unless a scene has stable layout, anchors or explicit route points. Stable layouts preserve authored slots; their dimensions must fit changing text. The compaction helper leaves stable scenes and anchors intact.
- In overview mode, use stable node ids and full step snapshots. Omitted statuses reset to idle. List active edges in narrative order; prefer lanes for execution boundaries and non-overlapping lane/row slots. Avoid edges through intervening nodes.
- Keep labels short and put long explanations in captions. Overview mode supports 2–6 nodes; scene mode supports up to 16 actors across the story, not 16 crowded into one frame. Split larger systems into separate stories without silently omitting important relationships.

## Generate and verify

```sh
architecture-story check /absolute/path/story.json
architecture-story styles
architecture-story select /absolute/path/story.json /absolute/path/selected.json --style "调用时序风"
architecture-story audit /absolute/path/story.json --strict
architecture-story export /absolute/path/story.json /absolute/path/story.html
# Explicit override, after reviewing composition:
architecture-story export /absolute/path/story.json /absolute/path/module.html --style module
```

`export` produces a self-contained offline page with built-in styles, keyboard controls and reduced-motion handling. `build` instead produces a Codex inline fragment using host styles. Use that mode only in a host that supports it. Output files are created exclusively; choose a new output filename for revisions rather than overwriting user work.

Test the contract with at least two deliberate counterexamples in temporary copies: activate a receiver before delivery, remove an approval prerequisite, or introduce an illegal cross-context edge. The audit must fail. Do not weaken the rule to get a green result; fix the storyboard or resolve the source ambiguity.

Inspect the rendered output at 736px and 320px using available browser tools. Confirm that the default canvas stays light under both light and dark operating-system preferences. Exercise a forward step, a nonadjacent jump, a backward jump, and play/pause. For scenes, also replay one scene and observe an intermediate frame, an expanded-to-compact transition, and completion/loop behavior where used. Confirm that labels fit, connectors do not cross actors or labels, waiting does not animate as delivery, old animations are cancelled, and no console errors occur. The CLI tests final poses, not all interpolated positions. Report untested behavior honestly if browser inspection is unavailable.

Use the visual-review loop in [references/node-design.md](references/node-design.md): inspect the busiest and narrowest frames, record concrete defects, fix them, then inspect the affected frames again. Retain before/after views when revising rejected visuals. Passing schema or causal checks alone does not establish visual quality.

For preset or alternative-frame changes, also run `node <skill-root>/scripts/verify-styles.mjs`. It checks default precedence, legacy compatibility, invalid selections and explicit alternative resets on an independent domain.

For icons, legends, outlines or arrowheads, run `node <skill-root>/scripts/verify-visual-language.mjs`. Inspect actual legend swatches against rendered links, state badges against declared facts, and icons at narrow widths. A visually uniform all-plain, icon-free diagram needs an explicit user preference or a semantic reason; it is not the default interpretation of compact.

When iterating against an animated reference, keep each exported revision and record the defect → changed field/runtime → inspected result. Recheck the targeted elements after each round, including entrance/growth midpoints, pause, restart and final values. Stop when the requested defects are resolved and verification passes; name remaining differences instead of claiming pixel parity or iterating without an observable improvement.

For player changes, run `node <skill-root>/scripts/verify-player.mjs` and `node <skill-root>/scripts/verify-visuals.mjs`. Also exercise canvas click, Space/Enter, menu expand/collapse, explicit autoplay off, reduced motion and touch controls in a real browser. Check another domain with the bundled expense approval or React example before publishing a generic change. `examples/support-comparison.json` independently exercises a right-side initials avatar and paired costs using the same renderer.

Use `examples/react-loop.json` and `examples/expense-approval.json` as independent patterns, not business templates. Do not add topic-specific names, branching logic, or timelines to the renderer. If a new presentation need cannot be expressed, propose a generic schema capability with a second-domain example and regression tests.

Deliver the story JSON and rendered result with a concise scope statement. Generating a page does not publish it or prove that a document platform accepts its iframe. Hosting, permissions and document insertion need separate user authorization.

## Skill maintenance

Keep resources grouped by responsibility: `runtime/` is the self-contained CLI/player package with its own manifest; `scripts/` contains authoring and verification helpers; `examples/` contains reusable story inputs; `references/` contains on-demand guidance; `agents/` contains optional host interface metadata. Core authoring and offline export must work without host metadata. Change this layout when dependencies or distribution requirements justify it; assess directory lint findings against these boundaries before moving files.

Describe capabilities and activation contexts in third person in frontmatter; use direct instructions in the body. Before publishing, check manifest/version agreement and bundled paths, run the verification helpers from an unpacked archive, and export the examples offline. For packaging or metadata changes, compare a previously verified story's exported HTML byte for byte; repeat browser motion checks when renderer output changes.
