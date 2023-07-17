import { useRef, useState, useEffect } from "react";

const MIME_TYPE = "audio/webm;codecs=opus";
const CHUNK_SIZE = 100; // ms
const SAMPLE_RATE = 16000; // in hertz
const SAMPLE_SIZE = 16; // in bits per linear sample
const CHANNELS = 1; // 1 for mono or 2 for stereo

const workletScript = `class PCMProcessor extends AudioWorkletProcessor {
  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    for (let channel = 0; channel < output.length; ++channel) {
      output[channel].set(input[channel]);
    }
    this.port.postMessage(input);
    return true;
  }
};

registerProcessor("pcm-processor", PCMProcessor)`;

const bb = new Blob([workletScript], {
  type: "application/javascript; charset=utf-8",
});

export const scriptURL = URL.createObjectURL(bb);

function getNumberOfChannels(pcmData) {
  const numSamples = pcmData[0].length; // Number of samples in one channel
  const numChannels = pcmData.length; // Number of arrays in pcmData

  // Check if the length is divisible evenly by the number of samples
  if (numSamples > 0 && numChannels % numSamples === 0) {
    return numChannels / numSamples; // Return the number of channels
  } else {
    return 1; // Default to mono (single channel) if unable to determine
  }
}

function convertPCMToWAV(pcmData, sampleRate = 16000) {
  const numberOfChannels = Array.isArray(pcmData[0]) ? pcmData.length : 1;
  const totalSamples = pcmData.length * numberOfChannels;

  const buffer = new ArrayBuffer(44 + totalSamples * 2);
  const view = new DataView(buffer);

  function writeString(view, offset, str) {
    for (let i = 0; i < str.length; ++i) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(view, 0, "RIFF");
  view.setUint32(4, 32 + totalSamples * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // SubChunk1Size
  view.setUint16(20, 1, true); // AudioFormat (PCM)
  view.setUint16(22, numberOfChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2 * numberOfChannels, true); // ByteRate
  view.setUint16(32, numberOfChannels * 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(view, 36, "data");
  view.setUint32(40, totalSamples * 2, true); // SubChunk2Size

  let offset = 44;
  for (let i = 0; i < pcmData.length; ++i) {
    const sample = pcmData[i];
    const sampleValue = sample < 0 ? sample * 0x8000 : sample * 0x7fff;

    if (numberOfChannels === 1) {
      view.setInt16(offset, sampleValue, true);
      offset += 2;
    } else {
      for (let channel = 0; channel < numberOfChannels; ++channel) {
        view.setInt16(offset, sampleValue[channel], true);
        offset += 2;
      }
    }
  }

  return new Blob([view], { type: "audio/wav" });
}


const AudioRecorder = () => {
  const audioEl = useRef(null);
  const [recording, setRecording] = useState(false);
  const [chunks, setChunks] = useState([]);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioContext, setAudioContext] = useState(null);
  const [mediaStream, setMediaStream] = useState(null);

  const handleStart = async () => {
    const device = await navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const [microphone] = devices.filter(
          (device) =>
            device.kind === "audioinput" && device.label.includes("FIFINE")
        );
        return new Promise((resolve) => {
          resolve(microphone.deviceId);
        });
      });

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: device,
        sampleRate: { ideal: SAMPLE_RATE },
        sampleSize: { ideal: SAMPLE_SIZE, max: SAMPLE_SIZE }, // in bits per linear sample
      },
    });
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const source = context.createMediaStreamSource(stream);
    await context.audioWorklet.addModule(scriptURL);
    const processor = new AudioWorkletNode(context, "pcm-processor");

    processor.port.onmessage = (e) => {
      setChunks((prev) => [...prev, e.data[0]]);
    };

    source.connect(processor);
    processor.connect(context.destination);

    setAudioContext(context);
    setMediaStream(stream);
    setRecording(true);
  };

  const handleStop = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setRecording(false);
    }
  };

  const handlePlay = () => {
    // Convert chunks to WAV file
    // We are assuming you have a function to convert raw PCM to WAV
    const blob = convertPCMToWAV(chunks);
    console.log("blob", blob);
    const url = URL.createObjectURL(blob);
    // const a = document.createElement("a");
    // a.href = url;
    // a.download = "test.wav";
    // a.click();
    setAudioUrl(url);
    setRecording(false);
    setChunks([]);
  };

  return (
    <div>
      <button onClick={handleStart} disabled={recording}>
        Start
      </button>
      <button onClick={handleStop} disabled={!recording}>
        Stop
      </button>
      <button onClick={handlePlay} disabled={recording || chunks.length === 0}>
        Play
      </button>
      <audio ref={audioEl} src={audioUrl} controls />
    </div>
  );
};

export default AudioRecorder;
