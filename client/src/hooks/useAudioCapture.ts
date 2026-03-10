import { useRef, useCallback, useState } from "react";

export function useAudioCapture(onAudioData: (data: ArrayBuffer) => void) {
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: true,
        sampleRate: 16000,
      },
    });

    const audioContext = new AudioContext({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(stream);
    // Use ScriptProcessorNode for simplicity (AudioWorklet is better but more complex)
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      const float32 = e.inputBuffer.getChannelData(0);
      // Convert to 16-bit PCM
      const int16 = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      onAudioData(int16.buffer);
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    streamRef.current = stream;
    processorRef.current = processor;
    contextRef.current = audioContext;
    setIsCapturing(true);
  }, [onAudioData]);

  const stop = useCallback(() => {
    processorRef.current?.disconnect();
    contextRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    processorRef.current = null;
    contextRef.current = null;
    setIsCapturing(false);
  }, []);

  return { start, stop, isCapturing };
}
