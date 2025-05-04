import { useState } from "react";
import { login } from "../../hooks/api";

interface LoginPageProps {
  onLoginSuccess: (nickname: string, room: string) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [nickname, setNickname] = useState("");
  const [room, setRoom] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    const success = await login(nickname, password);
    if (success) {
      setMessage("Login Successful! 🎉");
      onLoginSuccess(nickname, room); // 👉 inform App to change view
    } else {
      setMessage("Login Failed ❌");
    }
  };

  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col">
      <div className="absolute top-4 right-4 z-50">
        {/* 🌗 You can add TopBar here if needed */}
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="bg-card p-6 rounded-xl shadow-lg w-full max-w-sm space-y-4">
          <h2 className="text-xl font-bold">Login</h2>
          <input
            className="w-full p-2 border border-border rounded-md"
            placeholder="Nickname (Username)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <input
            type="password"
            className="w-full p-2 border border-border rounded-md"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            className="w-full p-2 border border-border rounded-md"
            placeholder="Room"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <button
            onClick={handleLogin}
            className="w-full py-2 bg-primary text-white rounded-md"
          >
            Login
          </button>
          {message && <div className="text-sm">{message}</div>}
        </div>
      </div>
    </div>
  );
}
