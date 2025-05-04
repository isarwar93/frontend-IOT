
import { useEffect, useRef } from "react";
import { GraphData } from "../types";
import { useUIStore } from "@/store/useUIStore";

interface Props {
  nickname: string;
  onChatMessage: (msg: string) => void;
  onGraphData: (data: GraphData) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  paused: boolean;
}

export const useWebSockets = ({
  nickname,
  onChatMessage,
  onGraphData,
  onConnect,
  onDisconnect,
  paused,
}: Props) => {
  const username = useUIStore((state) => state.username); // watch reactively
  const chatRef = useRef<WebSocket | null>(null);
  const graphRef = useRef<WebSocket | null>(null);
  const pausedRef = useRef(false);

  // Keep paused state in ref to avoid stale closure
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const formatTimestamp = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString();

  // Auto-connect only when both username and nickname are available
  useEffect(() => {
    if (!username || username.trim() === "") {
      console.warn("WebSocket not connected: username is empty");
      return;
    }

    if (!nickname || nickname.trim() === "") {
      console.warn("WebSocket not connected: nickname is empty");
      return;
    }

    const chatUrl = `ws://192.168.1.106:8000/ws/chat/${encodeURIComponent(
      username
    )}?nickname=${encodeURIComponent(nickname)}`;
    const graphUrl = `ws://192.168.1.106:8000/ws/graph/${encodeURIComponent(
      username
    )}?nickname=${encodeURIComponent(nickname)}`;

    // Create WebSocket connections
    chatRef.current = new WebSocket(chatUrl);
    graphRef.current = new WebSocket(graphUrl);

    // Chat WebSocket events
    chatRef.current.onopen = () => console.log("Chat connected");
    chatRef.current.onmessage = (e) => onChatMessage(e.data);
    chatRef.current.onclose = () => console.log("Chat disconnected");

    // Graph WebSocket events
    graphRef.current.onopen = () => onConnect();
    graphRef.current.onmessage = (e) => {
      if (pausedRef.current) return;
      try {
        const data = JSON.parse(e.data);
        const formatted: GraphData = {
          timestamp: formatTimestamp(data.timestamp),
          value: data.value,
        };
        onGraphData(formatted);
      } catch (err) {
        console.error("Invalid graph data", err);
      }
    };
    graphRef.current.onclose = () => onDisconnect();

    // Clean up sockets on unmount or username change
    return () => {
      chatRef.current?.close();
      graphRef.current?.close();
    };
  }, [username, nickname]); // Only reconnect if these change

  // Send chat message
  const sendMessage = (msg: string) => {
    if (chatRef.current?.readyState === WebSocket.OPEN) {
      chatRef.current.send(msg);
    }
  };

  // Manual disconnect (optional)
  const disconnect = () => {
    chatRef.current?.close();
    graphRef.current?.close();
  };

  return { sendMessage, disconnect };
};
