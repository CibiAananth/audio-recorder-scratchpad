class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    for (let channel = 0; channel < input.length; ++channel) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];
      for (let i = 0; i < inputChannel.length; ++i) {
        outputChannel[i] = inputChannel[i];
      }
    }

    // Here we are passing the input audio data to the main thread.
    // You may want to do more complex processing or downmix to mono first.
    this.port.postMessage({
      audioData: input[0],
    });

    return true;
  }
}

registerProcessor("audioProcessor", AudioProcessor);
