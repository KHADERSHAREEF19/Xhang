const STORAGE = "xhang-used-v1";
export function wasUsed(hash: string): boolean {
  try {
    return (
      (
        JSON.parse(localStorage.getItem(STORAGE) || "{}") as Record<
          string,
          boolean
        >
      )[hash] === true
    );
  } catch {
    throw new Error(
      "Browser storage is unavailable. Enable it to start a one-shot session.",
    );
  }
}
export function markUsed(hash: string): void {
  try {
    const map = JSON.parse(localStorage.getItem(STORAGE) || "{}") as Record<
      string,
      boolean
    >;
    map[hash] = true;
    localStorage.setItem(STORAGE, JSON.stringify(map));
  } catch {
    throw new Error(
      "Browser storage is unavailable. Enable it to start a one-shot session.",
    );
  }
}
