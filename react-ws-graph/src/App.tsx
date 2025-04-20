// src/App.tsx
import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/Dashboard';
import { ConfigPage } from './pages/Configuration';
import { SettingsPage } from './pages/Settings';
import TopBar from './components/TopBar';

function JoinForm({ onJoin }: { onJoin: (nickname: string, room: string) => void }) {
  const [nickname, setNickname] = useState('');
  const [room, setRoom] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname && room) onJoin(nickname, room);
  };

  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col">
      {/* 🌗 Theme Toggle Always Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <TopBar />
      </div>

      {/* 🎯 Centered Form */}
      <div className="flex-1 flex items-center justify-center">
        <form
          onSubmit={handleSubmit}
          className="bg-card p-6 rounded-xl shadow-lg w-full max-w-sm space-y-4"
        >
          <h2 className="text-xl font-bold">Join a Room</h2>
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
            Join
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [nickname, setNickname] = useState('');
  const [room, setRoom] = useState('');

  if (!nickname || !room) return <JoinForm onJoin={(nick, r) => { setNickname(nick); setRoom(r); }} />;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
      <Sidebar />
          {/* 🌙 Theme toggle at top right */}
      <TopBar />
      <main className="flex-1 overflow-y-auto p-1 w-96">
        <Routes>
          <Route path="/" element={<DashboardPage nickname={nickname} room={room} />} />
          <Route path="/dashboard/*" element={<DashboardPage nickname={nickname} room={room} />} />
          <Route path="/configuration" element={<ConfigPage />} />
          <Route path="/settings" element={<SettingsPage />} />

        </Routes>
      </main>
    </div>
  );
}
