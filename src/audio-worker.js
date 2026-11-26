import { quickSeconds, render } from "./synth.js";

// Message: { settings, mode }.
//   mode "both":  post the quick opening (~0.3 s to render), then the full piece.
//   mode "quick": post only the opening (used to pre-render presets in the background).
//   mode "full":  post only the full piece.
// The opening and the full piece are sample-identical where they overlap.
function post(kind, result) {
  self.postMessage({ kind, ...result }, [result.left.buffer, result.right.buffer]);
}
self.onmessage = ({ data }) => {
  const { settings, mode = "both" } = data;
  try {
    if (mode !== "full") post("quick", render(settings, { seconds: quickSeconds }));
    if (mode !== "quick") post("full", render(settings));
  } catch (error) {
    self.postMessage({ kind: "error", error: error.message });
  }
};
