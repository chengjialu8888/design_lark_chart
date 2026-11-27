# Semantic contract (CLI 0.9.0, scene schema v2)

Separate three layers: evidence (why the claim is justified), relations (what can communicate), and timeline (when something actually happens). These fields are declarative JSON, not executable business logic. The browser never calls the source URL.

## Canonical relations

Define each relationship once at the story root:

```json
"relations": [{
  "id": "submit", "from": "sender", "to": "receiver",
  "kind": "message", "label": "提交",
  "requires": ["submitted"], "produces": ["received"]
}]
```

Kinds: `message`, `call`, `return`, `ownership`, `dependency`. All have a direction. `requires`/`produces` default to empty. They constrain actual transfers only; an idle structural arrow does not assert delivery. `ownership` is an annotation, not an automatic dispatch mechanism. Endpoints must be distinct declared actors.

Each frame references relations:

```json
"links": [{"relation":"submit","state":"flow","travel":1200}]
```

States: `idle` (default, structural arrow), `flow` (one timed transfer), `waiting` (dashed stop mark, no delivery). `travel` is milliseconds, only allowed on `flow`, minimum 100, default 800. It must finish before the next frame or scene boundary. Endpoint actors must be visible. Duplicate relation instances in a frame are invalid. Do not override endpoints inside a frame; define a distinct relation when its meaning differs. Since CLI 0.11.0, a frame may override the displayed `label` with plain text or `""` to suppress repetition; canonical meaning and prerequisites remain unchanged. Optional `motion: "pointer"|"packet"` changes presentation only; `packet` is an optional plain-text payload label. Relation `style` selects pattern, tone and arrow as documented in scene-format.md; it does not assert delivery.

Routing defaults to facing ports. Optional relation `wideRoute` / `narrowRoute`:

```json
{"from":"bottom","to":"bottom","via":[[0.8,240],[0.2,240]]}
```

Ports: `left`, `right`, `top`, `bottom`; waypoints are `[xFraction,yPixels]`. This reserves a polyline lane, not automatic obstacle avoidance. Endpoints track moving actors. Labels default to path midpoint with a 9px upward offset. Optional `labelAt` (0–1 of path length) and `labelOffset: [dxPixels,dyPixels]` relocate a label into a reserved lane. Allow clearance for the whole label, not just the line. Keep at least 18px between ports for endpoint clearance, plus enough room for labels.

## Evidence and facts

```json
"contract": {
  "sources": [{
    "id":"source",
    "reference":"repo@revision:path:line or inspected URL or explicit assumption",
    "scope":"What was inspected, what was excluded, and adaptations"
  }],
  "facts": [
    {"id":"submitted","description":"User submitted request","source":"source","origin":"external"},
    {"id":"received","description":"Receiver got the request","source":"source","origin":"flow","after":["submitted"]}
  ],
  "rules": [
    {"id":"receive-first","type":"requires","actor":"receiver","states":["active","done"],"facts":["received"]}
  ]
}
```

A contract requires canonical `relations`. IDs use lowercase letters/digits/hyphens and start with a letter. Reference metadata is mandatory but its truth is not machine-proven. Use an explicit assumption as the source for invented business scenarios, not a fabricated citation.

- `external` facts represent observed/user/system decisions outside modeled transfers. They are author assertions, not verified events.
- `flow` facts require a prior transfer whose `produces` includes the fact and whose travel time has elapsed.
- `after` requires all listed facts in a **prior frame**, not simultaneous assertion. Unknown ids and cycles are rejected.
- `frame.facts` is a full, unique set of facts true by that frame. A received fact must appear in a later frame, not the sending frame. Facts accumulate across scenes.
- A genuine alternative scenario may set `scene.resetFacts: true` and a nonempty `branchReason`; prior facts and deliveries are reset. This is not a generic fix for contradictory chronology.

Rule types:

- `requires`: actor, nonempty `states` subset of `active`/`done`, and `facts`. Prevents acting before prerequisites. Optional `when` names a declared fact: the rule applies only once that fact is in the current snapshot. For repeated rounds, use a distinct ready fact in `when` and distinct arrival/result facts in `facts`; an earlier delivery cannot satisfy the later round. Facts still accumulate. Declare all important receivers/decisions; unruled actors cannot be inferred by the checker.
- `independent`: `actors` array of at least two ids. Rejects links directly joining those actors. This does not infer transitive information isolation or security boundaries.

Use a new fact id per distinct event when multiple rounds or repeated deliveries need separate proof. Reusing an already-true fact does not verify a new round. Unmodeled intermediate details must be described as a selected excerpt, not claimed fully audited.

## What audit covers

```sh
architecture-story audit story.json --strict
```

Prints `{errors,warnings,scope}`; nonzero for errors, and also for warnings in strict mode. Structural malformed input reports an error on stderr and nonzero. `check`, `build`, and `export` also reject semantic errors. Legacy scenes still render, but strict audit warns when a semantic contract is absent or empty.

Geometry checks final snapshots at stage widths 736 and 320: node overlap except declared containment, child containment, and connectors crossing unrelated non-container nodes. It does **not** prove text fitting, label collisions, motion-path clearance, accessibility quality, all intermediate widths, source correctness, or completeness of assertions. Browser review remains required.

Optional chat appearances include their 31px outside avatar lane in containment and route checks. Metric values are authored observations; bar growth is presentation, not a modeled business event. Their source accuracy remains outside the checker.

## Review checklist

1. Who initiates each action: human, scheduler, router, or current actor? Distinguish manual alternatives from automatic branches.
2. Is a line message flow, call/return, dependency, or ownership? Is any necessary relationship missing?
3. Does delivery precede processing, and result precede observation? Does success require an acknowledgement?
4. What exactly is waiting: current call, round, task, approval, or resource? Do not animate a waiting edge as successful delivery.
5. Are contexts truly independent? Are retries, cancellation and failure included or explicitly outside scope?
6. When collapsing a container, are identity and ownership preserved? Does backward navigation remove future state?
7. Deliberately break two rules in temporary JSON copies; strict audit should fail for the intended reason.
8. Inspect light/dark, wide/narrow, intermediate motion, pause/replay and completion. Record evidence and remaining gaps, not a blanket claim of correctness.
