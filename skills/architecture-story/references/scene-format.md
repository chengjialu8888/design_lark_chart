# Scene format v2

All display content is plain text. Do not embed executable code, markup or credentials. Source references may contain URLs or revision/path locators; they are metadata, not fetched or executed. The CLI accepts JSON; authoring helpers may generate JSON before invoking it.

| Field | Contract |
| --- | --- |
| `version` | `2` |
| `id` | Unique root id matching `[a-z][a-z0-9-]*` |
| `title`, `notice` | Nonempty; notice distinguishes implementation, proposal and illustrative output |
| `actors` | 1–16 unique actors with `id`, `label`, `kind` |
| `actor.kind` | `person`, `service`, `message`, `terminal`, `document`, `group` |
| `actor.visual` | Optional appearance and built-in vector avatar; see [visuals.md](visuals.md). Preset default, otherwise legacy module; chat requires kind message |
| `scenes` | Nonempty ordered array |
| `scene.label`, `detail` | Short navigation label and current scene heading |
| `scene.duration` | 1000–180000 milliseconds; long scenes support a persistent map, not longer empty waits |
| `scene.height`, `narrowHeight` | Stage heights in pixels, 240–900 |
| `scene.frames` | Full snapshots, increasing `at`, first at 0; last at least 700ms before scene end |
| `frame.at`, `caption` | Time in milliseconds and one short caption |
| `frame.resetFacts`, `branchReason` | Optional explicit alternative run; true requires a nonempty reason. Reset prior causal availability, never use to repair ordinary progress |
| `frame.items` | Map of known actor ids to visible actor state; omitted actors exit |
| `item.wide`, `narrow` | `[xFraction, yPixels, widthFraction, heightPixels]`; narrow used below 560px stage width |
| `item.label`, `lines` | Optional label override; array of up to 6 plain-text lines |
| `item.state` | Optional `normal`, `active`, `done`, `muted`, `waiting` |
| `item.contains` | Optional visible child ids; expands a container. Empty array preserves the empty boundary. No nesting. |
| `item.opacity` | Optional 0–1 visibility; zero hides the actor from accessibility text as well |
| `item.metric` | Optional paired bars for a document actor with empty lines; shared scale, explicit values, finite clock-driven entrance; see [visuals.md](visuals.md) |
| `presentation` | Optional `style:compact/module/sequence`, navigation `menu/questions/pills`, motion `packet/pointer`, density `regular/compact`, `legend:auto/none`, canvas and transition; unstyled legacy defaults retain responsive reflow |
| `scene.layout`, `anchors` | Optional `"fit"|"stable"` and actor ids. Stable preserves slots and stage; anchors must retain poses throughout the scene |
| `frame.focus`, `processing` | Optional actor ids. Focus dims unrelated context; processing controls breathing independently of state. Empty processing disables breathing |
| `frame.headline` | Optional reading-beat heading; otherwise scene.detail |
| `frame.links` | With canonical relations: `{relation,state?,travel?,motion?,packet?,transfer?,label?}`; packet is an optional transported plain-text label; label overrides display only (`""` hides it, CLI 0.11.0) |
| `relation.style` | Optional `{pattern:"solid"|"dashed"|"dotted",tone:"neutral"|"accent"|"success"|"warning",arrow:boolean,head:"open"|"filled"|"diamond"}` |
| `relation.legend` | Optional semantic label (1–16 characters), used by the current-link legend |
| `relations`, `contract`, `frame.facts` | See [semantic-contract.md](semantic-contract.md) for new story authoring |

Poses must stay within the authored stage. Height must be at least 48px, but real text often needs much more. Budget padding, label height, line wrapping and gaps. In 0.7.0, ordinary poses allocate layout slots: the renderer centers a content-sized node inside each slot instead of stretching a short label to the full width. Nodes use 13px titles and 11px metadata, cap width at 250px wide / 210px narrow, and wrap long content. Small reference tokens retain a micro layout. Expanded containers retain their width. The canvas fits each frame and ordinary nodes on the same row align by their centers; scenes with explicit route points retain their authored coordinates. Prefer a few prominent actors per frame; the actor limit is not a density target. Size estimates are conservative; the renderer does not solve arbitrary obstacles or guarantee text collision avoidance. Verify actual text and routes in a browser.

Use the same actor id when a message becomes a task or a task moves from Hub to Runtime. Actors keep DOM identity, interpolating their positions and dimensions in 550ms. Names stay readable; only changed body lines and captions reveal progressively. Missing actors fade out in place. Reduced-motion preferences remove transitions while retaining the finite timeline.

Keep the same caption through causal microframes; use a new caption when the reader needs a new claim. Stable scenes preserve ordinary slots rather than refitting each changing body line. Reserve enough width/height for every state. `scripts/compact-story.mjs` leaves these scenes intact. Pointer motion follows source center → ports and authored route → receiver center; arrival never precedes the declared travel time. Link DOM identity is persistent for canonical ids. No field encodes a domain-specific event.

Every frame is complete, not a delta. Backward jumps therefore restore all visible actors and text. Selecting a scene or replaying it starts at frame zero and stops at that scene's end. The main play control continues through all scenes. Pause freezes timeline and visual transitions; hidden documents pause. Navigation cancels the previous timeline, and same-scene host echoes are ignored.

Examples: `examples/react-loop.json` (source-aligned excerpt with explicit alternatives) and `examples/expense-approval.json` (illustrative business workflow) use the same CLI and renderer. `examples/pointer-approval.json` demonstrates anchored actors and pointer transfers.

## Optional design coordinates · 0.10.0

```json
{"navigation":"pills","motion":"packet","density":"compact",
 "canvas":{"wideWidth":720,"narrowWidth":380,"maxScale":1.35},
 "transition":{"duration":720,"easing":[0.22,0.9,0.24,1]}}
```

Canvas widths: wide 560–1200, narrow 280–560 and strictly smaller than wide. Max scale: 0.5–2, default 1. Select narrow at actual stage width below 560. Poses multiply x/width fractions by the selected design width; y/heights stay in design pixels. Scale is `min(maxScale, actualWidth/designWidth)`, horizontal offset centers the scaled design, and displayed height is `ceil(sceneHeight*scale)`. Captions, navigation, playback overlays and controls remain outside the transformed `.scene-canvas`. Font size, avatars and strokes scale together. Choose this only when reduced diagram typography is acceptable; reflow is still the default. Resize preserves elapsed time, scene and pause state.

Transition duration is 100–2000ms; four finite easing controls all lie in 0–1. Omitted transition keeps 550ms and the existing curve. Density defaults regular; compact plain nodes use 11px titles, 14px icons, 6px padding and 15px body line height. Chat remains 11px metadata/13px body with a 31px avatar lane in design coordinates.

Frame links may use `transfer: {timing:"continuous"|"segments",easing:[.22,.9,.24,1]}`. Explicit transfer defaults continuous and that curve. Without transfer, packet stays linear and pointer stays smoothstep. Routes may add `stops`: strictly increasing, unique, valid zero-based `via` indexes. Segments divide total travel equally at those logical stops; ports and other obstacle bends do not add timing beats. Each segment eases independently along its path length; zero-length segments merge. No stops means one segment. Timing, beam, packet and arrival share the elapsed/travel clock. Waiting never delivers. Stops add no business actor or fact.

## Slow signals · 0.12.0

`transfer.scope` is `"centers"` (legacy default) or `"route"`. Route mode uses the full travel duration on the visible arrow, from its source port to its destination port, without spending time hidden inside nodes. The same rounded SVG path determines both the arrow and signal positions.

`transfer.effect` is `"classic"` (default) or `"soft"`. Soft mode fades the signal in and out over up to 240ms, uses a faint trail, and fades a small arrival ring in and out over 650ms. It never pulses or loops. The arrival begins with zero opacity after declared delivery; it does not flash at full brightness. For pointer motion, the arrival sits at the end of the arrow in route mode. Preserve at least 650ms of the flow frame after `travel`, so the next snapshot does not cut it off. Beam, particle, trail and ring use the same scene clock, including pause and reduced motion.

For slower explanatory motion use `travel:1700` (about 2000 for a return) and `transfer:{"timing":"continuous","scope":"route","effect":"soft","easing":[.35,0,.65,1]}`. Continuous timing avoids the stop/start acceleration caused by easing every waypoint segment independently. Do not increase travel alone: retime receiver facts and subsequent frames together. `scripts/slow-transfers.mjs` scales ordinary travel by 1.9 and return travel by 2.5, adds 700ms of settlement where needed, and preserves the original final reading hold. It rejects invalid options and overlong scenes instead of clipping them.
