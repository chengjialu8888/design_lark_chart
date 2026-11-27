# Feishu document delivery

Use only when the user requests insertion or publication of this story. Generating a story does not authorize external upload. Confirm the exact document, insertion anchor and whether this is an addition or replacement; preserve permissions and unrelated content. Use available authenticated document tools or the native UI. Do not extract browser credentials, invent API endpoints, or upload confidential examples to another service.

## Prepare the artifact and location

1. Export a self-contained HTML page with the pinned CLI's `export`, not the host-dependent `build` fragment. Check that required code/styles are local and the page contains no credentials or unintended source material.
2. Check the current host's HTML preview support and size limit using its official help or actual UI. Feishu has supported HTML file previews, but capability and sandbox behavior must be verified for the target client. Do not promise that arbitrary pasted HTML or iframe markup will execute.
3. Read the original document and save an exact text/Markdown snapshot outside the skill package. Locate an unambiguous paragraph or block anchor. Prefer a structured insertion API if it supports the exact position; otherwise use the UI's file upload at a verified cursor position. Do not replace the entire section to add one attachment.
4. Inspect the available preview dimensions. Check a constrained-height fixture before upload when practical, and inspect the actual embedded viewport afterward. Around 450px is a useful stress case, not a Feishu constant. Keep start/pause reachable; move explanatory text out of the stage or simplify compositions before shrinking text. Report required scrolling. Do not claim a fit merely because the full page works in a tall browser window.

## Write once, then read back

Upload the standalone HTML as a file preview at the authorized anchor. Wait for upload/save completion. If the result is uncertain, inspect the document for the attachment before retrying, to avoid duplicates. Do not change access controls or use external hosting as an automatic fallback.

Read back the document with the same exporter. Identify the exact inserted fragment including its unique file token/block reference. Use the helper:

```sh
node <skill-root>/scripts/verify-document-insertion.mjs before.md after.md inserted-fragment.md
```

The helper proves only that removing one exact fragment restores the original bytes. It fails for duplicate/empty fragments, unrelated edits or an insertion at multiple possible identical positions. Inspect the anchor separately: byte equality does not prove correct placement. If the exporter is unstable, compare structured blocks with identity/content checks instead; do not silently normalize away real changes. A failed comparison calls for inspection, not automatic restoration of a possibly concurrently edited document.

## Accept the embedded result

Verify inside the document's actual preview, not a standalone tab:

- The diagram and controls render, rather than only an attachment card or source text.
- Observe startup. If paused, trigger Continue and observe a scene change. Do not assume autoplay from presentation mode.
- Pause and read progress twice to confirm it is stable. Exercise forward, backward and nonadjacent jumps; check that future state disappears.
- Replay a scene and observe an intermediate frame. Reach the end and exercise replay, or observe a second full cycle for looping.
- Check clipping, internal scrolling and control reachability at the actual size. Test mouse and keyboard separately where possible. Do not infer mobile support from a narrow desktop viewport.

Record the artifact version/hash, document anchor, exact-diff result, client, tested interactions, screenshot and untested surfaces. Distinguish local rendering, embedded rendering, embedded interaction and content preservation. A coordinate restriction in an automation tool is not an application bug; label the untested input path and use keyboard verification if available. If preview is blocked, report that outcome and offer a file/link or other user-approved fallback; do not claim successful embedding.

Leave the preview in an understandable starting state and provide the document anchor plus concise playback/scrolling limitations. Keep snapshots and tokens in the task's evidence directory, never in the reusable skill or public examples.
