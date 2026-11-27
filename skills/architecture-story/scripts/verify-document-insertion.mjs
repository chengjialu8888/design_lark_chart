#!/usr/bin/env node
// Read-only, byte-exact check. Placement and embedded behavior need separate review.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export function verifyInsertion(before, after, fragment) {
  const fail = reason => ({ok:false, reason});
  if (!fragment.length) return fail('empty-fragment');
  const first = after.indexOf(fragment);
  if (first < 0) return fail('fragment-not-found');
  if (after.indexOf(fragment, first + 1) >= 0) return fail('ambiguous-or-duplicate-fragment');
  if (before.indexOf(fragment) >= 0) return fail('fragment-already-present');
  const restored = Buffer.concat([after.subarray(0, first), after.subarray(first + fragment.length)]);
  if (!restored.equals(before)) return fail('unrelated-content-changed');
  return {ok:true, scope:'byte-exact-content-only', insertionByteOffset:first,
    beforeBytes:before.length, afterBytes:after.length, addedBytes:fragment.length};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const paths = process.argv.slice(2);
    if (paths.length !== 3) throw new Error('Usage: node verify-document-insertion.mjs before.md after.md inserted-fragment.md');
    const result = verifyInsertion(...paths.map(path => readFileSync(path)));
    console.log(JSON.stringify(result));
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(JSON.stringify({ok:false, reason:error.message}));
    process.exitCode = 2;
  }
}
