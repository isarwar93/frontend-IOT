// src/views/ChatView.tsx
import React, { useEffect, useRef, useState } from "react";

interface Props {
  nickname: string;
  room: string;
}

export const ChatView: React.FC<Props> = ({ nickname, room }) => {
  const [messages, setMessages] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // WebSocket setup
  useEffect(() => {
    const ws = new WebSocket(`ws://192.168.1.106:8000/ws/chat/${room}?nickname=${nickname}`);
    socketRef.current = ws;

    ws.onopen = () => console.log("✅ Chat WebSocket connected");

    ws.onmessage = (e) => {
      setMessages((prev) => [...prev, e.data]);
    };

    ws.onclose = () => console.log("❌ Chat WebSocket closed");
    ws.onerror = (err) => console.error("Chat WebSocket error", err);

    return () => ws.close(); // cleanup
  }, [room, nickname]);

  const sendMessage = () => {
    if (!message.trim() || socketRef.current?.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(message);
    setMessage("");
  };

  return (
    <div className="space-y-4">
      <div className="p-4 border border-border rounded-lg bg-card h-64 overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className="mb-1 text-sm text-muted-foreground">
            {msg}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-foreground"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-primary text-white rounded-md"
        >
          Send
        </button>
      </div>
    </div>
  );
};
