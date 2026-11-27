/** Ignore incompatible state and same-step echoes; neither should interrupt playback. */
export function restoreIndex(state, id, current, count) {
  const saved = state?.privateContent;
  return saved?.id === id && Number.isInteger(saved.index) && saved.index >= 0 && saved.index < count ? saved.index : current;
}
