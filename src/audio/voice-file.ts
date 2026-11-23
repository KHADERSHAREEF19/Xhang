import { MAX_PAYLOAD } from "../crypto/format";
export async function readVoiceFile(
  file: File,
  context: AudioContext,
): Promise<{ bytes: Uint8Array; mime: string; duration: number }> {
  const ext = file.name.split(".").at(-1)?.toLowerCase();
  const types: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    webm: "audio/webm",
    m4a: "audio/mp4",
  };
  if (
    !ext ||
    !types[ext] ||
    !file.size ||
    file.size > MAX_PAYLOAD ||
    (file.type && !/^(audio\/|video\/webm|video\/mp4)/.test(file.type))
  )
    throw new Error(
      "Choose an MP3, WAV, OGG, WebM or M4A voice file, up to 10 MB.",
    );
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const buffer = await context.decodeAudioData(bytes.slice().buffer);
    if (buffer.duration <= 0 || buffer.duration > 60.05) throw new Error();
    return { bytes, mime: types[ext], duration: buffer.duration };
  } catch {
    bytes.fill(0);
    throw new Error(
      "This voice file could not be decoded or exceeds 60 seconds.",
    );
  }
}
