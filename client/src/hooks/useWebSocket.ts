import { useEffect, useRef, useState, useCallback } from "react";

type MessageHandler = (data: any) => void;

export function useWebSocket(sessionId: string, role: "listener" | "reader") {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef<MessageHandler[]>([]);

  const addHandler = useCallback((handler: MessageHandler) => {
    handlersRef.current.push(handler);
    return () => {
      handlersRef.current = handlersRef.current.filter((h) => h !== handler);
    };
  }, []);

  const send = useCallback((data: string | ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  const sendJSON = useCallback((data: object) => {
    send(JSON.stringify(data));
  }, [send]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/?sessionId=${sessionId}&role=${role}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handlersRef.current.forEach((h) => h(data));
      } catch {}
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [sessionId, role]);

  return { connected, send, sendJSON, addHandler };
}
