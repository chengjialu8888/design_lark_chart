# Synchronized before/after stories

Read scene-format.md and semantic-contract.md first. Use the existing scene schema and player; comparison is an authoring pattern, not a separate engine.

## Establish a fair comparison

Fix one concrete input set and identify the changed mechanism. Pair corresponding events on one timeline: input, first write, second write, observation. Keep logical identity and expected outputs stable across lanes. Distinct lane actor ids represent the same logical input in different implementations; record this mapping. Do not use different data, omit a failure on one side, or accelerate one lane to imply a performance gain without evidence.

Record claims as source-backed current behavior, proposed behavior, or explicit assumptions. A selected interleaving illustrates a possible failure, not its frequency or a captured production trace. If the optimization changes scheduling, pair logical milestones and explain the changed order instead of forcing a false identical trace.

## Make the mechanism visible

- Preserve the shared object's identity while its mutable field changes; show the old value being replaced. Shared references should point to that same object, not to visually identical copies.
- Show independent results as distinct objects appearing after their producing events, then moving to their owners. Keep labels/keys visible; color alone is insufficient.
- Keep unchanged public facts visibly shared. A read-only dependency is not ownership or a data-copy operation. Avoid depicting full-object copying when only derived results are isolated.
- End with actual versus expected output for the same input on both sides. Pause long enough to inspect the mismatch or preserved result.
- Prefer short object labels and movement over paragraphs. Use parallel lanes when they fit; stack lanes at narrow widths while retaining the common scene timeline. Keep different states of one object under the same actor id.

The bundled `examples/shared-result.json` is an abstract two-job example: A/B share catalog P; A produces rA, B produces rB. One lane overwrites a shared result slot, the other retains per-job results. It assumes A-write, B-write, then reads, and makes no claim about a real system. Adapt the mechanism, not its names or fixed geometry.

## Review and test

Check input parity, stable identity, shared versus private fields, delivery-before-result, output ownership, and the final result pair. These are source/visual review obligations: CLI 0.4.1 does not evaluate arbitrary field values or prove transitive isolation. In particular, `independent` rejects direct links only; it does not detect two results aliasing through a third shared object.

Declare available prerequisite and independence rules. Test at least two invalid variants, such as an early result and an illegal result-to-result transfer, and verify rejection for the intended rule. Separately inspect field values and output ownership; a green audit alone cannot establish them.

Use the regular light/dark and wide/narrow browser checks. If delivery targets an embedded document, also check its actual available width and height using feishu-delivery.md. Do not add topic-specific renderer branches to fit the example.
