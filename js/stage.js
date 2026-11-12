// The stage: the canvas that shows the cover in the edit view and in the
// file preview. It reads the state and draws; it handles no pointer input.

// Mounts the stage on the page and publishes `ctx.stage`.
export function mountStage(ctx) {
  ctx.stage = null;
}
