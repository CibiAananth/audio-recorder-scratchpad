import { useRef, useState } from "react";

const MIME_TYPE = "audio/webm;codecs=opus";
const CHUNK_SIZE = 100; // ms
const SAMPLE_RATE = 16000; // in hertz
const SAMPLE_SIZE = 16; // in bits per linear sample

const AudioRecorder = () => {
  const audioEl = useRef<HTMLAudioElement | null>(null);

  const [recording, setRecording] = useState<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [chunks, setChunks] = useState<Blob[]>([]);
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

    navigator.mediaDevices
      .getUserMedia({
        audio: {
          deviceId: device,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
          sampleRate: { ideal: SAMPLE_RATE },
          sampleSize: { ideal: SAMPLE_SIZE, max: SAMPLE_SIZE }, // in bits per linear sample
        },
      })
      .then((stream: MediaStream) => {
        const options = { mimeType: MIME_TYPE }; // Opus codec
        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorder.start(CHUNK_SIZE);

        setMediaRecorder(mediaRecorder);
        setRecording(true);

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size === 0) return;

          const wave = e.data;

          console.log(wave);
          setChunks((oldChunks) => [...oldChunks, wave]);
        };
      })
      .catch((err) => console.error(err));
  };

  const handleStop = () => {
    if (mediaRecorder) {
      mediaRecorder.onstop = function () {
        const blob = new Blob(chunks, { type: MIME_TYPE });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };
      mediaRecorder.stop();
      setRecording(false);
      setChunks([]);
    }
  };

  const handlePlay = () => {
    audioEl?.current?.play();
  };

  return (
    <div>
      <button onClick={handleStart} disabled={recording}>
        Start
      </button>
      <button onClick={handleStop} disabled={!recording}>
        Stop
      </button>
      <button onClick={handlePlay} disabled={recording || !audioUrl}>
        Play
      </button>
      <audio ref={audioEl} src={audioUrl} controls />
    </div>
  );
};

export default AudioRecorder;
