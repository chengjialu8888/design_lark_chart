# Compact visual language · 0.14.0

The `index-0.12.html` reference combines plain processors with robot icons, message bubbles with sender/event avatars, quiet topic containers, varied line patterns, warning borders and short state badges. Its legend explains paired metrics. Reuse the vocabulary according to meaning; execution diagrams use a matching relationship legend.

Do not interpret compact as icon-free uniform boxes. Retain compact type and spacing while giving roles, relationships and current states distinct visual forms. Use one coherent palette; detail must help readers distinguish meaning.

| Element | Authoring choice |
| --- | --- |
| Service / processor | Plain compact node with a role icon; a focused module card may expose additional responsibility |
| Data object | Package or document icon, stable identity, brief state badge after the corresponding fact |
| Storage | Database icon; keep external storage outside the executing service boundary |
| Queue / delayed message | Queue or event icon; use chat only for actual conversation messages |
| Container | Quiet boundary, short title, optional pipeline icon; contains must express actual ownership |
| Active / failed / skipped | Restrained active shadow; warning outline and badge for a proven failure; dashed muted border for skipped work |
| Waiting / asynchronous boundary | Dotted outline and explicit text; it must not look like completed receipt |

`actor.visual.icon` selects an offline vector from `database`, `queue`, `process`, `filter`, `retry`, `gateway`, `pipeline`, `package`, `event`, `output`. Existing `avatar` options remain useful for chat and reference robot nodes. Explicit `avatar:"none"` hides the icon. `outline` accepts `solid`, `dashed`, `dotted`; frame state and tone also affect the border. Use `item.visual.badge` with 1–8 characters and reserve the 8px lane above it.

| Relationship | Typical convention, after checking its meaning |
| --- | --- |
| Call / local execution | Solid line, open arrowhead |
| Return / acknowledgement | Dashed return lane, open arrowhead |
| Failure return | Warning color, filled head, short failure badge on the relevant object |
| Message / delayed dispatch | Accent message path, distinct dashed or dotted lane when the boundary matters |
| Ownership / attachment | Dotted connector, diamond head where it helps clarify attachment |
| Dependency / waiting | Neutral connection; `arrow:false` or a waiting stop when no delivery occurs |

Use `relation.style.head:"open"|"filled"|"diamond"` alongside existing pattern/tone/arrow fields. These are presentation choices, not a change to relation kind or causality. Retain facts and source evidence when changing them.

New presets enable `presentation.legend:"auto"`. The legend derives from currently visible links and their actual style, deduplicating equal swatches. `relation.legend` is an optional plain-text semantic label up to 16 characters, useful for “异步启动” or “重试声明”. `legend:"none"` disables it. Keep the legend outside the scaled canvas; never invent a success status as a swatch label.

Mix appearances deliberately. Reference chat bubbles carry conversations; they are not a template for every RPC or data object. Keep old objects and their task text visible as state badges change. Arrow variation follows semantic roles, rather than assigning random shapes to make the page look busy.

Review wide and narrow intermediate states. Check icon/title wrapping, badge clearances, arrow ports and legend swatches. If roles, boundaries, returns and failures all look alike, revise the composition before delivery. Audit still rejects early receipt even when the arrow or badge looks convincing.
