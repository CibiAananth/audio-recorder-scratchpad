/* eslint-disable @typescript-eslint/no-misused-promises */
import { useRef, useState } from "react";

import { scriptURL, combineChunks, pcmToWav } from "./final";

const SAMPLE_RATE = 16000; // in hertz
const SAMPLE_SIZE = 16; // in bits per linear sample

const AudioRecorder = () => {
  const audioEl = useRef<HTMLAudioElement | null>(null);

  const [recording, setRecording] = useState<boolean>(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [chunks, setChunks] = useState<Float32Array[]>([]);
  const [audioUrl, setAudioUrl] = useState<string>("");

  const handleStart = async () => {
    const device: ConstrainDOMString = await navigator.mediaDevices
      .enumerateDevices()
      .then((devices): Promise<ConstrainDOMString> => {
        const [microphone] = devices.filter(
          (device) =>
            device.kind === "audioinput" && device.label.includes("FIFINE")
        );
        return new Promise((resolve) => {
          resolve(microphone.deviceId);
        });
      });

    const stream: MediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: device,
        sampleRate: { ideal: SAMPLE_RATE },
        sampleSize: { ideal: SAMPLE_SIZE, max: SAMPLE_SIZE }, // in bits per linear sample
      },
    });

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    await ctx.resume();
    await ctx.audioWorklet.addModule(scriptURL);
    const worklet = new AudioWorkletNode(ctx, "audioProcessor");

    worklet.port.onmessage = ({
      data,
    }: {
      data: { audioData: Float32Array; channel: number };
    }) => {
      const { audioData, channel } = data;
      if (audioData) {
        setChunks((prevChunks) => {
          const newChunks = [...prevChunks];
          newChunks[channel] = audioData;
          return newChunks;
        });
      }
    };

    source.connect(worklet);
    worklet.connect(ctx.destination);

    setAudioContext(ctx);
    setRecording(true);
  };

  const handleStop = async () => {
    if (audioContext) {
      await audioContext.close();
      setRecording(false);
    }
  };

  const handlePlay = () => {
    try {
      if (chunks.length > 0) {
        const combinedPcmData = combineChunks(chunks);
        const wavBlob = pcmToWav(combinedPcmData);
        const url = URL.createObjectURL(wavBlob);
        setAudioUrl(url);
        setChunks([]);
      }
    } catch (error) {
      console.error("error", error);
    }
  };

  return (
    <div>
      <button onClick={handleStart} disabled={recording}>
        Start
      </button>
      <button onClick={handleStop} disabled={!recording}>
        Stop
      </button>
      <button onClick={handlePlay} disabled={recording}>
        Play
      </button>
      <audio ref={audioEl} src={audioUrl} controls />
    </div>
  );
};

export default AudioRecorder;
