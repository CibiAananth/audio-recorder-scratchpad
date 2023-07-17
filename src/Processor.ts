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

declare function registerProcessor(
  name: string,
  processorCtor: (new (
    options?: AudioWorkletNodeOptions
  ) => AudioWorkletProcessor) & {
    parameterDescriptors?: AudioParamDescriptor[];
  }
): undefined;

const workletScript = `class WorkletProcessor extends AudioWorkletProcessor {
  process(
    inputs,
    outputs,
    parameters,
  ) {
    // Do something with the data, e.g. convert it to WAV
    console.log(inputs);
    return true;
  }
}
registerProcessor('audioProcessor', WorkletProcessor);`;

const blob = new Blob([workletScript], {
  type: "application/javascript; charset=utf-8",
});

export const scriptURL = URL.createObjectURL(blob);
