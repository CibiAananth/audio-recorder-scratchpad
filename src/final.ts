export const workletScript = `class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.bufferSize = Math.floor((sampleRate * 100) / 1000);
    this.buffers = [[], []];
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const channelCount = input.length;
    const chunkSize = input[0].length;

    for (let i = 0; i < chunkSize; i++) {
      for (let j = 0; j < channelCount; j++) {
        const sample = Math.max(-1, Math.min(1, input[j][i]));
        this.buffers[j].push(sample);

        if (this.buffers[j].length >= this.bufferSize) {
          // Send the captured chunk to the main thread
          const buffer = new Float32Array(this.buffers[j]);
          this.port.postMessage({ audioData: buffer, channel: j });

          // Clear the buffer
          this.buffers[j] = [];
        }
      }
    }

    return true;
  }
}

registerProcessor("audioProcessor", AudioProcessor);`;

export const scriptURL = URL.createObjectURL(
  new Blob([workletScript], {
    type: "application/javascript; charset=utf-8",
  })
);

export const combineChunks = (chunks: Float32Array[]): Float32Array => {
  const maxLength = Math.max(...chunks.map((chunk) => chunk.length));
  const combined = new Float32Array(maxLength * 2);
  for (let i = 0; i < maxLength; i++) {
    for (let j = 0; j < chunks.length; j++) {
      const sample = chunks[j][i] || 0;
      combined[i * 2 + j] = sample;
    }
  }
  return combined;
};

export function combinePCMChunks(pcmChunks: Float32Array[]): Float32Array {
  // Calculate the total length of the combined PCM data
  let totalLength = 0;
  for (const chunk of pcmChunks) {
    totalLength += chunk.length;
  }

  // Create a new Float32Array with the total length for stereo audio (double the size)
  const combinedPCM = new Float32Array(totalLength * 2);

  // Combine the individual chunks into the combined PCM array
  let offset = 0;
  for (const chunk of pcmChunks) {
    for (let i = 0; i < chunk.length; i++) {
      const sample = chunk[i];
      combinedPCM[offset * 2] = sample; // Left channel
      combinedPCM[offset * 2 + 1] = sample; // Right channel
      offset++;
    }
  }

  return combinedPCM;
}

export function pcmToWav(pcmData: Float32Array, sampleRate = 16000) {
  const bitDepth = 16;
  const numChannels = 2; // Assuming stereo audio

  const numSamples = pcmData.length;
  const blockAlign = numChannels * (bitDepth / 8);
  const byteRate = sampleRate * blockAlign;

  const buffer = new ArrayBuffer(44 + numSamples * blockAlign);
  const view = new DataView(buffer);

  // Write the WAV header
  writeString(view, 0, "RIFF"); // Chunk ID
  view.setUint32(4, 36 + numSamples * blockAlign, true); // Chunk Size
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
  view.setUint32(40, numSamples * blockAlign, true); // Subchunk 2 Size

  const offset = 44;
  if (bitDepth === 16) {
    for (let i = 0; i < numSamples; i++) {
      const index = i * numChannels;
      let sampleLeft = pcmData[index];
      let sampleRight = pcmData[index + 1];

      // Check if the samples are within the expected range
      if (sampleLeft < -1 || sampleLeft > 1) {
        // Perform scaling or normalization if sample is out of range
        sampleLeft = Math.max(-1, Math.min(1, sampleLeft));
      }

      if (sampleRight < -1 || sampleRight > 1) {
        // Perform scaling or normalization if sample is out of range
        sampleRight = Math.max(-1, Math.min(1, sampleRight));
      }

      // Scale the samples to the range of a 16-bit signed integer
      const scaledSampleLeft = sampleLeft * 32767;
      const scaledSampleRight = sampleRight * 32767;

      // Write the scaled samples into the DataView
      view.setInt16(offset + i * blockAlign, scaledSampleLeft, true); // Left channel
      view.setInt16(offset + i * blockAlign + 2, scaledSampleRight, true); // Right channel
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
