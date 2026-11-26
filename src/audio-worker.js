import { render } from "./synth.js";
self.onmessage = ({ data }) => {
  try {
    const result = render(data);
    self.postMessage(result, [result.left.buffer, result.right.buffer]);
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
