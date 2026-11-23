import { runner } from "../core/runner";
import { $, escape } from "./dom";
/** Standard masked entry, not an expected-length display or per-keystroke verifier. */
export class SecretEntry {
  private focused = false;
  constructor(
    private root: HTMLElement,
    id: string,
    label: string,
    onSubmit: (value: string) => void,
  ) {
    root.innerHTML = `<form class="attempt-form" autocomplete="off"><label class="field">${escape(label)}<input id="${id}" data-attempt type="password" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="1024" disabled placeholder="Wait for playback, then type or paste your secret" aria-label="${escape(label)}"></label><button class="primary" type="submit" disabled>Unlock ${"↗"}</button><p class="smallprint">Submit once during playback. No timing targets or expected-length hints. Passphrases are case-sensitive; spaces count. Piano taps add lowercase letters; Shift changes pitch only.</p></form>`;
    this.form.onsubmit = (e) => {
      e.preventDefault();
      if (!runner.running || runner.clock.now() < 0) return;
      const value = this.input.value;
      this.input.value = "";
      this.lock();
      onSubmit(value);
    };
  }
  private get form(): HTMLFormElement {
    return $<HTMLFormElement>("form", this.root);
  }
  private get input(): HTMLInputElement {
    return $<HTMLInputElement>("[data-attempt]", this.root);
  }
  update(): void {
    const enabled = runner.running && runner.clock.now() >= 0;
    this.input.disabled = !enabled;
    this.form.querySelector<HTMLButtonElement>("button")!.disabled = !enabled;
    if (enabled && !this.focused) {
      this.focused = true;
      this.input.focus({ preventScroll: true });
    }
  }
  lock(): void {
    this.input.disabled = true;
    this.form.querySelector<HTMLButtonElement>("button")!.disabled = true;
  }
  clear(): void {
    this.input.value = "";
    this.lock();
  }
  append(char: string): void {
    if (
      !runner.running ||
      runner.clock.now() < 0 ||
      this.input.disabled ||
      this.input.value.length >= 1024
    )
      return;
    const i = this.input;
    i.setRangeText(
      char,
      i.selectionStart ?? i.value.length,
      i.selectionEnd ?? i.value.length,
      "end",
    );
    i.focus({ preventScroll: true });
  }
}
