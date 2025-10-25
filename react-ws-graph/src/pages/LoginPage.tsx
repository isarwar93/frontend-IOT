// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import TopBar from '../components/TopBar';
import { login } from '../../hooks/api'; // adjust path if needed

interface LoginPageProps {
  onLoginSuccess: (username: string, nickname: string) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !nickname) {
      setMessage("Please fill all fields");
      return;
    }

    let success = await login(username, password);
    success = true; // Temporarily bypass login for testing
    if (success) {
      onLoginSuccess(username, nickname);
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
