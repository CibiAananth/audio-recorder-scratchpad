/* eslint-disable @typescript-eslint/no-misused-promises */
import { useEffect, useRef, useState } from "react";
import {
  SAMPLE_RATE,
  SAMPLE_SIZE,
  scriptURL,
  pcmToWav,
  combinePCMChunks,
} from "./utils";
import { Buffer } from "buffer";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import AudioVisualizer from "./Vis";

const chunkInterval = 100;
const OPTIONS_ANALYSER = {
  smoothingTime: 0.6,
  fftSize: 512,
};
const AudioRecorder = () => {
  const audioEl = useRef<HTMLAudioElement>(null);
  const bufferIntervalId = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);
  const socket = useRef<Socket | null>(null);
  const chunksInPCMRef = useRef<Int16Array | null>(null);

  const [startInterval, setStartInterval] = useState<boolean>(false);
  const [recording, setRecording] = useState<boolean>(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [chunksInPCM, setChunksInPCM] = useState<Int16Array | null>(null);
  const [recordingInPCM, setRecordingInPCM] = useState<Int16Array | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [channelCount, setChannelCount] = useState<number>(2);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [visData, setVisData] = useState<Uint8Array | null>(null);

  useEffect(() => {
    chunksInPCMRef.current = chunksInPCM; // Update ref with latest state
    if (bufferIntervalId.current === null && startInterval) {
      bufferIntervalId.current = window.setInterval(() => {
        if (chunksInPCMRef.current?.length) {
          const pcmChunk = Buffer.from(chunksInPCMRef.current.buffer);
          // socket.current?.emit("pcmChunk", pcmChunk); // Sending the audio chunk

          const wavChunk = Buffer.from(chunksInPCMRef.current.buffer);
          // socket.current?.emit("wavChunk", wavChunk); // Sending the audio chunk

          setChunksInPCM(null); // Reset the chunk for the next interval
        }
      }, chunkInterval);
    }

    return () => {
      if (bufferIntervalId.current !== null && !startInterval) {
        clearInterval(bufferIntervalId.current);
      }
    };
  }, [chunksInPCM, startInterval, channelCount]);

  useEffect(() => {
    return () => {
      console.log("unmounting");
      cancelAnimationFrame(rafId.current!);
    };
  }, []);

  const initSocket = () => {
    socket.current = io("http://localhost:3333", {
      path: "/custom/",
    });

    socket.current.on("connect", () => {
      console.log("connected");
      socket.current?.emit("join", "test");
    });

    socket.current.on("transcript", (data: string) => {
      setTranscript(data);
    });

    socket.current.on("disconnect", () => {
      console.log("disconnected");
    });
  };

  const handleStart = async () => {
    // initSocket();

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

    const ctx = new AudioContext({
      sampleRate: SAMPLE_RATE,
    });
    const source = ctx.createMediaStreamSource(stream);
    await ctx.resume();
    await ctx.audioWorklet.addModule(scriptURL);

    const analyser = ctx.createAnalyser();
    analyser.smoothingTimeConstant = OPTIONS_ANALYSER.smoothingTime;
    analyser.fftSize = OPTIONS_ANALYSER.fftSize;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    rafId.current = requestAnimationFrame(tick);

    function tick() {
      analyser.getByteTimeDomainData(dataArray);
      setVisData(dataArray);
      rafId.current = requestAnimationFrame(tick);
    }

    const worklet = new AudioWorkletNode(ctx, "audioProcessor");
    setChannelCount(worklet.channelCount);
    source.connect(worklet);
    worklet.connect(analyser);
    worklet.connect(ctx.destination);

    worklet.port.onmessage = (event: { data: Float32Array[] }) => {
      if (!startInterval) setStartInterval(true);

      const combinedData: Int16Array = combinePCMChunks(event.data);

      setRecordingInPCM((prev) => {
        // append prev Int16Array with new Int16Array combinedData
        if (prev === null) {
          return combinedData;
        }

        const newChunks = new Int16Array(prev.length + combinedData.length);
        newChunks.set(prev);
        newChunks.set(combinedData, prev.length);
        return newChunks;
      });

      // Buffering chunks to be sent
      setChunksInPCM((prev) => {
        if (prev === null) {
          return combinedData;
        }

        const newChunks = new Int16Array(prev.length + combinedData.length);
        newChunks.set(prev);
        newChunks.set(combinedData, prev.length);
        return newChunks;
      });

      // const now = new Date();
      // if (now.getTime() - lastSendTimeRef.current.getTime() >= 2000) {
      //   // It's been at least 100ms since we last sent a chunk
      //   if (chunksInPCM?.length) {
      //     const wavData = pcmToWav(chunksInPCM, channelCount);
      //     console.log("sending wav data");

      //     socket.current?.emit("audioChunk", wavData); // Sending the audio chunk
      //     setChunksInPCM(new Int16Array()); // Reset the chunk for the next interval
      //   }

      //   lastSendTimeRef.current = now;
      // }
    };

    setStream(stream);
    setAudioContext(ctx);
    setRecording(true);
  };

  const handleStop = async () => {
    if (audioContext) {
      stream?.getTracks().forEach((track) => track.stop());
      await audioContext.close();
      setAudioContext(null); // Reset the audio context
      setRecording(false);
    }

    if (bufferIntervalId.current) {
      window.clearInterval(bufferIntervalId.current);
      bufferIntervalId.current = null;
    }

    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }

    socket.current?.disconnect();
    socket.current = null;
  };

  const handlePlay = () => {
    if (recordingInPCM?.length === 0) {
      return;
    }

    const wavData = pcmToWav(recordingInPCM as Int16Array, channelCount);
    const blobUrl = URL.createObjectURL(
      new Blob([wavData], { type: "audio/wav" })
    );
    audioEl.current!.src = blobUrl;
    setAudioUrl(blobUrl);
    setRecordingInPCM(null);
    setStream(null);
  };

  const handleDownload = () => {
    if (recordingInPCM?.length === 0) {
      return;
    }

    const wavData = pcmToWav(recordingInPCM as Int16Array, channelCount);
    const blobUrl = URL.createObjectURL(
      new Blob([wavData], { type: "audio/wav" })
    );

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "audio.wav";
    a.click();
    a.remove();
  };

  console.log("visData", visData);

  return (
    <div>
      <Button onClick={handleStart} disabled={recording}>
        Start
      </Button>
      <Button onClick={handleStop} disabled={!recording}>
        Stop
      </Button>
      <Button onClick={handleDownload} disabled={recording}>
        Download
      </Button>
      <Button onClick={handlePlay} disabled={recording}>
        Play
      </Button>
      <audio ref={audioEl} src={audioUrl} controls />
      <div>
        <p>Transcript</p>
        <p>{transcript}</p>
      </div>
      {visData !== null && <AudioVisualizer audioData={visData} />}
    </div>
  );
};

export default AudioRecorder;
