export const DEMO_SECRET = "xk3_AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA";
// Eagerly preload at app startup: later user actions read memory, not the network.
function preload(name: string): Promise<ArrayBuffer> {
  const task = fetch(`${import.meta.env.BASE_URL}${name}`).then((r) => {
    if (!r.ok) throw new Error("Demo unavailable");
    return r.arrayBuffer();
  });
  void task.catch(() => undefined);
  return task;
}
const song = preload("demo.wav");
const packaged = preload("demo.xhang.wav");
export async function demoSong(): Promise<File> {
  return new File([(await song).slice(0)], "after-hours.wav", {
    type: "audio/wav",
  });
}
export async function demoPackage(): Promise<File> {
  return new File([(await packaged).slice(0)], "after-hours.xhang.wav", {
    type: "audio/wav",
  });
}
