import { useEffect, useRef } from "react";
import { GraphData } from "../types";

interface Props {
  room: string;
  nickname: string;
  onChatMessage: (msg: string) => void;
  onGraphData: (data: GraphData) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  paused: boolean;
  // bufferSize: number;
}

export const useWebSockets = ({
  room,
  nickname,
  onChatMessage,
  onGraphData,
  onConnect,
  onDisconnect,
  paused,
  // bufferSize,
}: Props) => {
  const chatRef = useRef<WebSocket | null>(null);
  const graphRef = useRef<WebSocket | null>(null);
  // const [graphData, setGraphData] = useState<GraphData[]>([]); 
  const pausedRef = useRef(false); // 🟢 REF HERE

  useEffect(() => {
    pausedRef.current = paused; // 🟢 UPDATE REF
  }, [paused]);

  // useEffect(() => {
  //   // Ensure that we only trim the data to bufferSize on new data received
  //   if (graphData.length > bufferSize) {
  //     setGraphData(prevData => prevData.slice(-bufferSize)); // Trim excess data
  //   }
  // }, [bufferSize]); // Only trigger when bufferSize changes

  const formatTimestamp = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString();

  const connect = () => {
    const chatUrl = `ws://192.168.1.106:8000/ws/chat/${room}?nickname=${nickname}`;
    const graphUrl = `ws://192.168.1.106:8000/ws/graph/${room}?nickname=${nickname}`;

    chatRef.current = new WebSocket(chatUrl);
    graphRef.current = new WebSocket(graphUrl);

    chatRef.current.onopen = () => console.log("Chat connected");
    chatRef.current.onmessage = (e) => onChatMessage(e.data);
    chatRef.current.onclose = () => console.log("Chat disconnected");

    graphRef.current.onopen = () => onConnect();
    graphRef.current.onmessage = (e) => {
      // ✅ Check paused from the ref
      if (pausedRef.current) {
        return;
      }
      try {
        const data = JSON.parse(e.data);
        const formatted: GraphData = {
          timestamp: formatTimestamp(data.timestamp),
          value: data.value,
        };
        // Add new data and ensure we trim based on bufferSize
        // setGraphData(prevData => {
        //   const newData = [...prevData, formatted];  // Add new data
        //   return newData.length > bufferSize ? newData.slice(-bufferSize) : newData; // Trim excess
        // });
        onGraphData(formatted); // Call parent callback
      } catch (err) {
        console.error("Invalid graph data", err);
      }
    };

    graphRef.current.onclose = () => onDisconnect();
  };

  const sendMessage = (msg: string) => {
    if (chatRef.current?.readyState === WebSocket.OPEN) {
      chatRef.current.send(msg);
    }
  };

  const disconnect = () => {
    chatRef.current?.close();
    graphRef.current?.close();
  };

  return { connect, sendMessage, disconnect };
};
