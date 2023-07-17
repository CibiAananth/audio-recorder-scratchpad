import { ReactNode, useRef } from "react";

export default function AudioVisualizer({
  audioData,
}: {
  audioData: Uint8Array;
}): ReactNode {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  (() => {
    if (!canvasRef.current) {
      return;
    }
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d")!;
    const width = canvas.width;
    const height = canvas.height;

    let x = 0;
    const sliceWidth = (width * 1.0) / audioData.length;

    context.lineWidth = 2;
    context.strokeStyle = "#000000";
    context.clearRect(0, 0, width, height);

    context.beginPath();
    context.moveTo(0, height / 2);

    for (const item of audioData) {
      const y = (item / 255.0) * height;
      context.lineTo(x, y);
      x += sliceWidth;
    }
    context.lineTo(x, height / 2);
    context.stroke();
  })();

  return <canvas width="300" height="300" ref={canvasRef} />;
}
