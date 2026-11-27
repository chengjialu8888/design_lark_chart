# Sources and distribution notes

- Base: user-provided local `design-lark-chart` v1.2 workflow, planning references, examples, style parameters and validation scripts, copied here at the user's explicit request. No separate upstream public repository or license was identified. This repository does not invent an upstream author or blanket license for that material.
- Public release adaptation: portable entry point, environment checks, local smoke test, report diagrams, setup and operational notes. Original local files remain unchanged. Tenant-origin raw boards, previews and cloud identifiers are excluded from this public package; historical references are retained as context, not proof of current compatibility.
- SVG/Feishu practice informed by [zarazhangrui/beautiful-feishu-whiteboard](https://github.com/zarazhangrui/beautiful-feishu-whiteboard), MIT. The new practice note is a concise adaptation; the upstream skill, palette library and scripts are not vendored. Its copyright and license remain with the author.
- CLI commands refer to [larksuite/cli](https://github.com/larksuite/cli) and [whiteboard-cli](https://www.npmjs.com/package/@larksuite/whiteboard-cli); those dependencies are installed separately under their own terms.
- Consulting structure guidance is newly written for this package. [likaku/Mck-ppt-design-skill](https://github.com/likaku/Mck-ppt-design-skill) is an optional reference for a complete presentation engine, not bundled code or a mandatory dependency.

Do not include private reports, source tokens, credentials or generated client work in public contributions. A public repository does not grant access to any Feishu tenant. No end-to-end compatibility claim is made without the corresponding test artifact.

- Dense consulting visual preset: user-provided prompt, palette and visual constraints. The linked `mck-ppt-design` skill provides content-structure guidance; its code/engine is not bundled. The preset does not imply affiliation with or endorsement by McKinsey & Company. No private case data is included.

## Optional module integration — 1.4.0

At the user's explicit request, four complete user-selected AgentBuddy packages are included under `skills/`: research-tech-visualization 0.3.0, system-swimlane-diagram 1.0.0, architecture-story 0.15.0, and crayon-tech-diagram 1.0.0. Per-package `ORIGIN.md` and `assets/extension-modules.json` preserve names, upstream versions and original source-tree fingerprints. No separate license files were supplied by those packages; this repository does not invent upstream authors or grant a blanket license to third-party materials. Existing upstream terms remain applicable.

Crayon invocation notes are adapted for available host image tools rather than requiring an internal provider. Source diagrams and demonstrations are reference assets, not evidence of a user's system or experiment. No marketplace authentication, tenant report documents, user login state or registry cache is distributed. The npm `private` marker in the offline animation runtime manifest means it is not published as an npm package; the runtime is bundled for local execution only.
