export function waveform(buffer: AudioBuffer, bins = 1000): number[] {
  const data = buffer.getChannelData(0);
  const stride = Math.max(1, Math.floor(data.length / bins));
  return Array.from({ length: bins }, (_, i) => {
    let max = 0;
    for (
      let j = i * stride;
      j < Math.min(data.length, (i + 1) * stride);
      j += 12
    )
      max = Math.max(max, Math.abs(data[j]));
    return max;
  });
}
export function onsets(buffer: AudioBuffer): number[] {
  const data = buffer.getChannelData(0);
  const block = Math.floor(buffer.sampleRate * 0.02);
  const energies: number[] = [];
  for (let i = 0; i < data.length; i += block) {
    let sum = 0;
    for (let j = i; j < Math.min(i + block, data.length); j++)
      sum += data[j] ** 2;
    energies.push(Math.sqrt(sum / block));
  }
  const result: number[] = [];
  let avg = 0;
  for (let i = 0; i < energies.length; i++) {
    const e = energies[i];
    if (
      i > 75 &&
      e > avg * 1.5 &&
      e > 0.035 &&
      i * 20 - (result.at(-1) ?? 0) > 400
    )
      result.push(i * 20);
    avg = avg * 0.9 + e * 0.1;
  }
  return result;
}
export function snap(time: number, spots: number[], enabled: boolean): number {
  if (!enabled) return Math.round(time);
  const near = spots.reduce(
    (a, b) => (Math.abs(b - time) < Math.abs(a - time) ? b : a),
    time + 151,
  );
  return Math.round(Math.abs(near - time) <= 150 ? near : time);
}
