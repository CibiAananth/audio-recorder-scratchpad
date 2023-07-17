export default async function createAudioProcessor(
  module: string | URL,
  name = "processor-name"
): Promise<AudioWorkletNode | null> {
  let audioContext = null;
  try {
    audioContext = new AudioContext();
    await audioContext.resume();
    await audioContext.audioWorklet.addModule(module);
  } catch (e) {
    return null;
  }

  return new AudioWorkletNode(audioContext, name);
}
