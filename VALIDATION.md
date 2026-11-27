# Validation scope

Commands and results for the initial public package are recorded after local execution. Checks cover skill metadata, Python/shell syntax, JSON assets, tenant identifier scan, environment detection, and the included SVG fixture's local check/conversion/render. They do not certify every legacy chart type or actual cloud edit/export. Use references/feishu-operations.md in a user-authorized task to finish that check.

## Initial public package — 2026-11-02

- Skill validator: passed. Python AST, shell syntax and bundled JSON: passed.
- Read-only online preflight: passed on Node 25.2.1, Python 3.14.7, lark-cli 1.0.85, whiteboard-cli 0.2.13. This records one host, not all OS combinations.
- Generic quickstart SVG: 14 nodes, 2 connectors; static errors=0, warnings=0. OpenAPI conversion and PNG render succeeded; image reviewed for Chinese text, card boundaries and arrows.
- Tenant URL/identifier and author machine path scan: no private source locators in published files. Raw boards, tenant previews and fetch scripts excluded.
- Cloud writes and actual Feishu image round trip: not run as part of package validation. Current user task publishes a skill, not a new test document.

- Remote installation: `npx skills add https://github.com/chengjialu8888/design_lark_chart --skill design-lark-chart --agent codex --copy -y` completed successfully in an isolated temporary project; installed-copy local preflight passed. No existing user skill installation was overwritten.

## Dense visual preset — 2026-11-09

- Added `mck-dense-consulting` as an opt-in visual preset; linked `mck-ppt-design` as the content-framework layer. No Mck engine code is bundled and no executable rendering logic changed.
- Verified the six exact colors are readable by both the existing style-seed loader and `plan.style_budget` color loader, with no fallback notes.
- Verified the original supplied prompt is preserved exactly, relative Markdown links resolve, JSON assets parse, and `git diff --check` passes.
- Reviewed changed public files for private tenant URLs, local user paths, transient login parameters and private document identifiers; none included.
- No cloud write, new rendered example, font verification or visual round trip was performed for this documentation/preset update. Per-artifact checks remain required when the preset is used.

## Modular extension release — 2026-11-27 / v1.4.0

- Integrated four complete source packages with source versions/fingerprints and per-module provenance; preserved the animation runtime byte for byte. Crayon's host-specific invocation guidance was adapted to available image tools and explicit document targets.
- Built and unpacked five deterministic archives: main skill plus four standalone modules. All five entrypoints passed skill metadata validation; Python AST, JSON parsing and module-relative links passed from extracted contents.
- Packaging behavior tests passed: standalone resources are retained, ZIP hashes are reproducible, existing releases are not overwritten, symlinks fail before archive creation.
- From extracted standalone animation package, styles, visual-language, player and visual tests passed (31 tests); Node CLI offline export passed. Exported expense-approval HTML was byte-identical to the inspected source package export.
- From extracted research package, experiment JSON, architecture SVG and results-page checks passed. Existing local Playwright/Chrome rendered the results page; no structural/runtime errors or horizontal overflow were reported at 1440px. This is a sample check, not certification of every asset or every input.
- Extracted crayon downloader detected the sample JPEG's actual format/dimensions and generated a review thumbnail. This tested local file handling, not an external image provider or generation quality.
- Reviewed source swimlane and crayon references and generated previews; the shipped examples are illustrative. Real Feishu writes, embeds, hosted deployments and new image generation were not performed for this package release.
- Public-content scan found no private tenant document URLs, machine user paths, transient login parameters or key blocks in added text/code files. Original private source document and registry authentication are not bundled.
- Offline animation was additionally exercised in real Chrome at fresh 736px and 320px viewports: explicit start under reduced motion, next/previous, nonadjacent jumps and replay. Dark OS preference retained a white canvas; no runtime errors or horizontal document overflow were observed. This does not cover every intermediate frame or all browsers.
