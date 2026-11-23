import { runCrypto, type CryptoJob } from "./operations";
// Serialize jobs: never allocate two Argon2 working sets concurrently.
let queue = Promise.resolve();
self.onmessage = (event: MessageEvent<{ id: number; job: CryptoJob }>) => {
  const { id, job } = event.data;
  queue = queue.then(async () => {
    let last = -1;
    try {
      const result = await runCrypto(job, (fraction) => {
        const percent = Math.floor(fraction * 100);
        if (percent !== last) {
          last = percent;
          self.postMessage({ id, kind: "progress", fraction });
        }
      });
      self.postMessage(
        { id, kind: "result", ok: true, result },
        { transfer: [result.buffer] },
      );
    } catch {
      self.postMessage({ id, kind: "result", ok: false });
    }
  });
};
