import { useState, useEffect } from "react";

const worklet = `class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.recordedChunks = [];
        this.isRecording = false;
        this.port.onmessage = (event) => {
            if (event.data.isRecording !== undefined) {
                this.isRecording = event.data.isRecording;
            } else if (event.data.type === 'getRecordedData') {
                this.port.postMessage(this.recordedChunks);
                this.recordedChunks = [];
            }
        }
    }

    process(inputs, outputs, parameters) {
        if (this.isRecording) {
            // Copy input audio data to recordedChunks
            const input = inputs[0];
            this.recordedChunks.push(input);
        }

        return true;
    }
}

registerProcessor('audio-worklet-processor', AudioProcessor);
`;

const scriptURL = URL.createObjectURL(
  new Blob([worklet], {
    type: "application/javascript; charset=utf-8",
  })
);

export default function Recorder() {
  const [recordingData, setRecordingData] = useState([]);
  const [audioContext, setAudioContext] = useState(null);
  const [audioWorkletNode, setAudioWorkletNode] = useState(null);
  const [mediaStream, setMediaStream] = useState(null);

  useEffect(() => {
    if ("AudioWorklet" in window) {
      const context = new AudioContext({ sampleRate: 16000 });
      setAudioContext(context);
      context.audioWorklet.addModule(scriptURL).then(() => {
        const node = new AudioWorkletNode(context, "audio-worklet-processor");
        node.port.onmessage = (event) => {
          setRecordingData(event.data);
        };
        setAudioWorkletNode(node);
      });
      // Request for microphone access
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          setMediaStream(stream);
        })
        .catch((err) => {
          console.error(err);
        });
    }
  }, []);

  const startRecording = () => {
    if (audioWorkletNode && mediaStream) {
      // Create a MediaStreamAudioSourceNode
      // Feed the HTMLMediaElement into it
      const source = audioContext.createMediaStreamSource(mediaStream);

      // Connect the AudioWorkletNode to the audio input
      source.connect(audioWorkletNode);
      audioWorkletNode.connect(audioContext.destination);

      audioWorkletNode.port.postMessage({ isRecording: true });
      audioContext.resume();
    }
  };

  const stopRecording = () => {
    if (audioWorkletNode) {
      audioWorkletNode.port.postMessage({ isRecording: false });
      const recordedData = audioWorkletNode.port.postMessage({
        type: "getRecordedData",
      });
      setRecordingData(recordedData);
    }
  };

const playRecording = () => {
  if (recordingData && recordingData.length > 0) {
    // Calculate the total length
    const totalLength = recordingData.reduce(
      (acc, chunk) => acc + chunk.length,
      0
    );

    // Create a new Float32Array of total length
    const data = new Float32Array(totalLength);

    // Copy each chunk of audio data into the new Float32Array
    let offset = 0;
    for (let chunk of recordingData) {
      data.set(chunk, offset);
      offset += chunk.length;
    }

    // Create the AudioBuffer
    const buffer = new AudioBuffer({
      length: data.length,
      numberOfChannels: 1,
      sampleRate: 16000,
    });
    buffer.copyToChannel(data, 0);

    // Start the source
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
  } else {
    console.log("No recording data available");
  }
};




  return (
    <div>
      <button onClick={startRecording}>Start</button>
      <button onClick={stopRecording}>Stop</button>
      <button onClick={playRecording}>Play</button>
    </div>
  );
}
