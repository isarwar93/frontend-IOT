// src/views/ChatView.tsx
import React, { useEffect, useRef, useState } from "react";
import { useWebSockets } from "../hooks/useWebSockets";
import { useUIStore } from "@/store/useUIStore";

interface Props {
  nickname: string;
  user: string;
}

export const ChatView: React.FC<Props> = ({ nickname, user }) => {
  const username = useUIStore((s) => s.username);
  const [messages, setMessages] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onChatMessage = (msg: string) => {
    setMessages((prev) => [...prev, msg]);
  };

  // Use shared WebSocket hook only when username is available
  const ws = username
    ? useWebSockets({
        nickname,
        paused: false,
        onChatMessage,
        onGraphData: () => {},
        onConnect: () => console.log("✅ Chat connected"),
        onDisconnect: () => console.log("❌ Chat disconnected"),
      })
    : { sendMessage: () => {}, disconnect: () => {} };

  useEffect(() => {
    return () => ws.disconnect?.(); // cleanup
  }, [user, nickname]);

  const sendMessage = () => {
    if (!message.trim()) return;
    ws.sendMessage(message);
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
