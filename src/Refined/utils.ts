export const workletScript = `class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    // if (input.length === 1) {
    //   console.log("Mono input");
    // } else if (input.length === 2) {
    //   console.log("Stereo input");
    // } else {
    //   console.log("Unsupported number of channels");
    // }
    
    for (let channel = 0; channel < output.length; ++channel) {
      output[channel].set(input[channel]);
    }
    this.port.postMessage(input);
    return true;
  }
};

registerProcessor("audioProcessor", AudioProcessor);`;

export const scriptURL = URL.createObjectURL(
  new Blob([workletScript], {
    type: "application/javascript; charset=utf-8",
  })
);

export const SAMPLE_RATE = 16000; // in hertz
export const SAMPLE_SIZE = 16; // in bits per linear sample

export function combinePCMChunks(pcmChunks: Float32Array[]): Int16Array {
  // const numChannels = pcmChunks.length;
  // const numFrames = pcmChunks[0].length; // Assume all channels have the same number of frames
  // const combinedData = new Int16Array(numChannels * numFrames);

  const totalFrames = pcmChunks.reduce(
    (total, chunk) => total + chunk.length,
    0
  );

  const combinedData = new Int16Array(totalFrames);

  let offset = 0;
  for (const chunk of pcmChunks) {
    for (let i = 0; i < chunk.length; i++) {
      const sample = Math.max(-1, Math.min(1, chunk[i])) * 32767; // Scale to 16-bit range
      combinedData[offset * 2] = sample; // Left channel
      combinedData[offset * 2 + 1] = sample; // Right channel
      offset++;
    }
  }

  return combinedData;
}

export function pcmToWav(pcmData: Int16Array, numChannels = 2): ArrayBuffer {
  const bitDepth = SAMPLE_SIZE;
  const sampleRate = SAMPLE_RATE;
  const HEADER_SIZE = 44;

  const blockAlign = numChannels * (bitDepth / 8);
  const byteRate = sampleRate * blockAlign;

  const buffer = new ArrayBuffer(HEADER_SIZE + pcmData.length * (bitDepth / 8));
  const view = new DataView(buffer);

  // Write the WAV header
  writeString(view, 0, "RIFF"); // Chunk ID
  view.setUint32(4, 36 + pcmData.length * (bitDepth / 8), true); // Chunk Size
  writeString(view, 8, "WAVE"); // Format

  // Subchunk 1: Format Subchunk
  writeString(view, 12, "fmt "); // Subchunk 1 ID
  view.setUint32(16, 16, true); // Subchunk 1 Size
  view.setUint16(20, 1, true); // Audio Format (PCM)
  view.setUint16(22, numChannels, true); // Number of Channels
  view.setUint32(24, sampleRate, true); // Sample Rate
  view.setUint32(28, byteRate, true); // Byte Rate
  view.setUint16(32, blockAlign, true); // Block Align
  view.setUint16(34, bitDepth, true); // Bits per Sample

  // Subchunk 2: Data Subchunk
  writeString(view, 36, "data"); // Subchunk 2 ID
  view.setUint32(40, pcmData.length * (bitDepth / 8), true); // Subchunk 2 Size

  for (let i = 0; i < pcmData.length; i++) {
    view.setInt16(HEADER_SIZE + i * (bitDepth / 8), pcmData[i], true);
  }
  return buffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _floatTo16BitPCM(
  output: DataView,
  offset: number,
  input: Float32Array
) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}
