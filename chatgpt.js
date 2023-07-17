function pcmToWav(pcmData, sampleRate) {
  const channels = 2; // Dual-channel audio
  const bitDepth = 16; // 16-bit per sample
  const bytesPerSample = bitDepth / 8;
  const blockAlign = channels * bytesPerSample;
  const numSamples = pcmData.length / channels;

  const buffer = new ArrayBuffer(44 + pcmData.length * bytesPerSample);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, "RIFF"); // Chunk ID
  view.setUint32(4, 36 + pcmData.length * bytesPerSample, true); // Chunk Size
  writeString(view, 8, "WAVE"); // Format
  writeString(view, 12, "fmt "); // Subchunk1 ID
  view.setUint32(16, 16, true); // Subchunk1 Size
  view.setUint16(20, 1, true); // Audio Format (PCM)
  view.setUint16(22, channels, true); // Number of Channels
  view.setUint32(24, sampleRate, true); // Sample Rate
  view.setUint32(28, sampleRate * blockAlign, true); // Byte Rate
  view.setUint16(32, blockAlign, true); // Block Align
  view.setUint16(34, bitDepth, true); // Bits per Sample
  writeString(view, 36, "data"); // Subchunk2 ID
  view.setUint32(40, pcmData.length * bytesPerSample, true); // Subchunk2 Size

  // PCM audio data
  const offset = 44;
  if (bitDepth === 16) {
    for (let i = 0; i < numSamples; i++) {
      const index = i * channels;
      const sampleLeft = pcmData[index];
      const sampleRight = pcmData[index + 1];
      view.setInt16(offset + i * blockAlign, sampleLeft * 32767, true); // Left channel
      view.setInt16(offset + i * blockAlign + 2, sampleRight * 32767, true); // Right channel
    }
  }

  return new Blob([view], { type: "audio/wav" });
}

// Helper function to write a string into the DataView
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Usage example
const sampleRate = 44100; // CD-quality audio

// Assuming you already have a single dual-channel PCM chunk called `pcmChunk`
const wavBlob = pcmToWav(pcmChunk, sampleRate);
const url = URL.createObjectURL(wavBlob);

console.log(url); // URL for the WAV audio file


function combinePCMChunks(pcmChunks) {
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

// Usage example
const combinedPCM = combinePCMChunks(pcmChunks);
console.log(combinedPCM);


function generatePCMChunk(chunkSize, sampleRate, frequency) {
  const numSamples = chunkSize * sampleRate;
  const pcmData = new Float32Array(numSamples * 2); // Double the size for stereo

  const amplitude = 0.5;
  const angularFrequency = (2 * Math.PI * frequency) / sampleRate;

  for (let i = 0; i < numSamples; i++) {
    const sample = amplitude * Math.sin(angularFrequency * i);

    // Set the same sample for both channels (left and right)
    pcmData[i * 2] = sample; // Left channel
    pcmData[i * 2 + 1] = sample; // Right channel
  }

  return pcmData;
}

// Usage example
const chunkSizeInSeconds = 0.1; // 100 milliseconds
const sampleRate = 44100; // CD-quality audio
const frequency = 440; // A4 note

const pcmChunk = generatePCMChunk(chunkSizeInSeconds, sampleRate, frequency);
console.log(pcmChunk);

