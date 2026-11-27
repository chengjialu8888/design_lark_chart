# Built-in composition presets · 0.15.0

For new stories, record `presentation.style: "compact"`. The API `newStory(spec)` and bundled gallery generator apply this default. Plain `export` of an old unstyled JSON retains legacy rendering.

Users can directly say “用示例紧凑风画执行流程”, “用架构模块风画系统依赖” or “用调用时序风画 RPC 链路”. Map those labels to the IDs below, then use the corresponding `examples/style-<id>.json` as the visual composition reference. Preserve an existing story's selection on revisions. `newStory(spec, labelOrId)` accepts either form and writes the canonical ID.

Open [the bundled gallery](../examples/style-gallery.html) when the user asks to choose or compare. Switch styles, then click “采用此风格”: it reveals a reusable request with a copy button, plus a downloadable illustrative JSON containing that style's authored layout. Send the copied request to the agent to adopt the style for a real diagram. The gallery works offline and does not rely on a particular agent host.

| Style | Nodes and composition | Best use |
| --- | --- | --- |
| compact | Small role icons, 11px labels, state borders/badges, quiet ownership containers, varied relationship styles and retained objects | Execution, error isolation, object flow |
| module | 13px module titles, small icons, system boundaries, layers sized for responsibility | Dependencies, system components |
| sequence | Compact participants in fixed positions, separate call/return lanes, retry outside the current round | RPC, asynchronous acknowledgement |

All presets use a 720/380 design canvas, maximum scale 1.35, pill navigation, live relationship legends and 720ms layout transitions. Explicit presentation values override defaults; explicit actor visuals remain intact. Compact keeps icons for ordinary roles; containers stay quiet unless explicitly given a symbol. Only new authoring chooses compact by default. Unknown styles fail. `styles` lists defaults; `export input.json output.html --style sequence` embeds the selection in rendered data while leaving the input untouched.

To persist a choice for an existing story, use a new filename:

```sh
node <skill-root>/runtime/story.mjs select input.json selected.json --style "调用时序风"
node <skill-root>/runtime/story.mjs check selected.json
node <skill-root>/runtime/story.mjs export selected.json selected.html
```

`select` validates the chosen story and saves the ID without materializing preset defaults. It preserves facts, timing, poses and explicit visuals. A style switch may require pose or visual adjustments; compare against the selected template before delivering.

Choose the preset before writing poses. CLI selection resolves defaults; it cannot recompose arbitrary layouts. Use the three generated examples as composition templates. They express the same illustrative request → read → return → result facts with different layouts. Generate a self-contained gallery with:

```sh
node <skill-root>/scripts/generate-style-gallery.mjs <existing-output-directory>
```

For compact, follow [visual-language.md](visual-language.md): use short service nodes with role icons and a low-contrast group only for true ownership. Keep dependencies outside that boundary. Let data objects retain identity and show isolation through state, badge or location. Avoid converting service names into chat bubbles. Leave unobstructed lanes between node rows and outside groups.

For module, allocate enough height for icons and body wrapping; group by responsibility rather than distributing everything into three equal cards. For sequence, keep participants stable in wide and narrow layouts, use distinct directions for request and return, and keep waiting separate from delivery. A send ACK does not mean later consumption completed.

Prefer one persistent map with progressive frames. Alternative runs can use frame-level `resetFacts:true` and a reason, with a visible headline that distinguishes them. The limit is three minutes per scene; split for a genuine ownership or composition change. Slower transfers still need arrival buffers and reading holds.

Audit and rendering share the preset resolver. Check actual wide/narrow text and paths in a browser; presets are defaults, not an automatic layout solver. Published players omit the style selector. The gallery supplies the comparison and selection interface.
