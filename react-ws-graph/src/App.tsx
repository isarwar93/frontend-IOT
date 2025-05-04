// src/App.tsx
import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/Dashboard';
import { SensorConfigPage } from './pages/SensorConfig';
import { ConfigPage } from './pages/Configuration';
import { SettingsPage } from './pages/Settings';
import TopBar from './components/TopBar';
import { login } from '../hooks/api'; // 🔥 assuming your login API is here

function LoginForm({ onLoginSuccess }: { onLoginSuccess: (username: string, nickname: string, room: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [room, setRoom] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !nickname || !room) {
      setMessage("Please fill all fields");
      return;
    }

    const success = await login(username, password);
    if (success) {
      onLoginSuccess(username, nickname, room);
    } else {
      setMessage("Login failed. Check credentials.");
    }
  };

  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col">
      {/* 🌗 Theme Toggle Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <TopBar />
      </div>

      {/* 🎯 Centered Login Form */}
      <div className="flex-1 flex items-center justify-center">
        <form
          onSubmit={handleSubmit}
          className="bg-card p-6 rounded-xl shadow-lg w-full max-w-sm space-y-4"
        >
          <h2 className="text-xl font-bold">Login</h2>

          <input
            className="w-full p-2 border border-border rounded-md"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
            placeholder="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <input
            className="w-full p-2 border border-border rounded-md"
            placeholder="Room"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <button
            type="submit"
            className="w-full py-2 bg-primary text-white rounded-md"
          >
            Login
          </button>

          {message && <div className="text-sm text-center text-red-500">{message}</div>}
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [room, setRoom] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLoginSuccess = (username: string, nickname: string, room: string) => {
    setUsername(username);
    setNickname(nickname);
    setRoom(room);
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
      <Sidebar />
      <TopBar />
      <main className="flex-1 overflow-y-auto p-1">
        <Routes>
          <Route path="/" element={<DashboardPage nickname={nickname} username={username} />} />
          <Route path="/dashboard/*" element={<DashboardPage nickname={nickname} username={username} />} />
          <Route path="/sensor-config" element={<SensorConfigPage />} />
          <Route path="/configuration" element={<ConfigPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}
