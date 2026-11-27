# Story format v1

All author text is plain text. Do not provide HTML, JavaScript, CSS, arbitrary URLs or embedded credentials.

| Field | Contract |
| --- | --- |
| `version` | `1` |
| `id` | Unique lowercase identifier matching `[a-z][a-z0-9-]*`; also the root DOM id |
| `title`, `notice` | Nonempty text; notice must distinguish current implementation, proposal, or illustration |
| `nodes` | 2–6 objects with unique `id`, `label`, `role` |
| `lanes` | Optional 2–3 objects with unique `id`, `label` |
| `node.lane`, `node.row` | Required with lanes; known lane id and integer 0–2; no duplicate slots |
| `edges` | Unique `id`, `from`, `to`; endpoints must exist and differ |
| `steps` | Nonempty array of full snapshots |
| `step.label`, `detail` | Step name and short explanation |
| `step.payload`, `task` | Message/data label and illustrative or observed task state |
| `step.active` | Unique node ids to highlight |
| `step.edges` | Unique edge ids, in the order packets should traverse them |
| `step.status` | Map of node ids to plain-text statuses; omitted entries reset to idle |

Minimal example:

```json
{
  "version": 1,
  "id": "request-reply",
  "title": "A request and its reply",
  "notice": "Illustrative mechanism",
  "nodes": [
    {"id":"client","label":"Client","role":"Sends a request"},
    {"id":"server","label":"Server","role":"Handles the request"}
  ],
  "edges": [{"id":"request","from":"client","to":"server"}],
  "steps": [{
    "label":"Request", "detail":"The client sends one request to the server.",
    "payload":"Request", "task":"Waiting for response",
    "active":["client","server"], "edges":["request"],
    "status":{"client":"Sent","server":"Received"}
  }]
}
```

Layout is three columns by default. Lanes pin nodes to columns and rows on wider screens; narrow screens use a two-column grid in node array order. Node ids are independent of ordering. Keep the narrow order understandable too. Consecutive rows in a lane produce the clearest vertical paths. Desktop lanes are hidden on narrow screens, so node labels must remain understandable without them.
