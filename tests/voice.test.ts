import { it, expect } from "vitest";
import { readVoiceFile } from "../src/audio/voice-file";
it("preserves original uploaded voice bytes exactly while validating duration", async () => {
  const source = new Uint8Array([1, 2, 3]);
  const file = new File([source], "voice.wav", { type: "audio/wav" });
  const context = {
    decodeAudioData: async () => ({ duration: 4 }),
  } as unknown as AudioContext;
  const result = await readVoiceFile(file, context);
  expect(result.bytes).toEqual(source);
  expect(result.mime).toBe("audio/wav");
  expect(result.duration).toBe(4);
});
it("rejects video, unknown extensions, empty files and overly long audio", async () => {
  const ctx = {
    decodeAudioData: async () => ({ duration: 61 }),
  } as unknown as AudioContext;
  for (const name of ["voice.wav", "video.mp4", "voice.exe"])
    await expect(
      readVoiceFile(new File([new Uint8Array([1])], name), ctx),
    ).rejects.toThrow();
  await expect(readVoiceFile(new File([], "voice.wav"), ctx)).rejects.toThrow();
});
