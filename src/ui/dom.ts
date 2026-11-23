import { ownedBuffer } from "../core/credentials";
export function $<T extends HTMLElement = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
}
export function escape(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function toast(message: string): void {
  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;
  $("#toasts").append(item);
  setTimeout(() => item.remove(), 4500);
}
export function download(
  bytes: Uint8Array,
  name: string,
  mime = "application/octet-stream",
): void {
  const url = URL.createObjectURL(
    new Blob([ownedBuffer(bytes)], { type: mime }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function busy(text: string): string {
  return `<div class="busy" role="status"><span class="spinner"></span><span>${escape(text)}</span><progress aria-label="${escape(text)}"></progress><small>This stays on your device. Encryption stays local. Argon2id uses a bounded worker; generated keys use HKDF.</small></div>`;
}
export const icons = {
  arrow:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></svg>',
  upload:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>',
};
export function uploadZone(
  id: string,
  accept: string,
  title: string,
  subtitle: string,
): string {
  return `<label class="dropzone" id="${id}-drop">${icons.upload}<strong>${title}</strong><span>${subtitle}</span><span class="button small">Choose a file ${icons.arrow}</span><input class="file-input" type="file" id="${id}" accept="${accept}" aria-label="${title}"></label>`;
}
export function bindUpload(id: string, callback: (file: File) => void): void {
  const input = $<HTMLInputElement>(`#${id}`);
  const zone = $(`#${id}-drop`);
  input.addEventListener("change", () => {
    if (input.files?.[0]) callback(input.files[0]);
  });
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("dragging");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragging"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragging");
    if (e.dataTransfer?.files[0]) callback(e.dataTransfer.files[0]);
  });
}
export function audioFile(file: File): boolean {
  return (
    /\.(mp3|wav|ogg|m4a)$/i.test(file.name) &&
    (!file.type || /^(audio\/|video\/mp4)/.test(file.type))
  );
}
export function timeLabel(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export function kdfProgress(root: ParentNode, fraction: number): void {
  const p = root.querySelector<HTMLProgressElement>("progress");
  if (p) {
    p.max = 100;
    p.value = Math.max(0, Math.min(100, Math.floor(fraction * 100)));
    p.setAttribute("aria-valuetext", `Argon2id ${p.value}%`);
  }
}
