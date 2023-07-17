interface AudioWorkletProcessor {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

// eslint-disable-next-line no-var
declare var AudioWorkletProcessor: {
  prototype: AudioWorkletProcessor;
  new (options?: AudioWorkletNodeOptions): AudioWorkletProcessor;
};

type AudioParamDescriptor = {
  name: string;
  automationRate: "a-rate" | "k-rate";
  minValue: number;
  maxValue: number;
  defaultValue: number;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function registerProcessor(
  name: string,
  processorCtor: (new (
    options?: AudioWorkletNodeOptions
  ) => AudioWorkletProcessor) & {
    parameterDescriptors?: AudioParamDescriptor[];
  }
): undefined;

const workletScript = `class AudioProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'bitDepth', defaultValue: 16 }];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    const bitDepth = parameters.bitDepth[0];

    for (let channel = 0; channel < input.length; ++channel) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];
      for (let i = 0; i < inputChannel.length; ++i) {
        outputChannel[i] = inputChannel[i];
      }
    }

    // Convert to 16-bit PCM
    const pcmData = new Int16Array(input[0].length);
    for (let i = 0; i < input[0].length; ++i) {
      const s = Math.max(-1, Math.min(1, input[0][i]));
      pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Create WAV header
    const wavData = this.createWavHeader(pcmData, bitDepth);

    this.port.postMessage({
      audioData: inputs
    });

    return true;
  }

  createWavHeader(pcmData, bitDepth) {
    const buffer = new ArrayBuffer(44 + pcmData.length * 2);
    const view = new DataView(buffer);

    // RIFF identifier
    this.writeString(view, 0, 'RIFF');
    // File length
    view.setUint32(4, 32 + pcmData.length * 2, true);
    // RIFF type
    this.writeString(view, 8, 'WAVE');
    // Format chunk identifier
    this.writeString(view, 12, 'fmt ');
    // Format chunk length
    view.setUint32(16, 16, true);
    // Sample format (raw)
    view.setUint16(20, 1, true);
    // Channel count
    view.setUint16(22, 1, true);
    // Sample rate
    view.setUint32(24, this.sampleRate, true);
    // Byte rate (sample rate * block align)
    view.setUint32(28, this.sampleRate * 2, true);
    // Block align (channel count * bytes per sample)
    view.setUint16(32, 2, true);
    // Bits per sample
    view.setUint16(34, bitDepth, true);
    // Data chunk identifier
    this.writeString(view, 36, 'data');
    // Data chunk length
    view.setUint32(40, pcmData.length * 2, true);

    // Write PCM data
    for (let i = 0; i < pcmData.length; ++i) {
      view.setInt16(44 + i * 2, pcmData[i], true);
    }

    return new Uint8Array(buffer);
  }

  writeString(view, offset, string) {
    for (let i = 0; i < string.length; ++i) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

registerProcessor('audioProcessor', AudioProcessor);`;

const blob = new Blob([workletScript], {
  type: "application/javascript; charset=utf-8",
});

export const scriptURL = URL.createObjectURL(blob);
