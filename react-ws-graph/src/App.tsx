// src/App.tsx
import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/Dashboard';
import { SensorConfigPage } from './pages/SensorConfig';
import LayoutConfigPage  from './pages/LayoutConfig'; 
import { ConfigPage } from './pages/GeneralConfig';
import { SettingsPage } from './pages/Settings';
import TopBar from './components/TopBar';
import LoginPage from './pages/LoginPage';

export default function App() {
    const [username, setUsername] = useState('');
    const [nickname, setNickname] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const handleLoginSuccess = (username: string, nickname: string) => {
        setUsername(username);
        setNickname(nickname);
        setIsLoggedIn(true);
    };

    if (!isLoggedIn) {
        return <LoginPage onLoginSuccess={handleLoginSuccess} />;
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
                <Route path="/layout-config" element={<LayoutConfigPage />} />
                <Route path="/configuration" element={<ConfigPage />} />
                <Route path="/settings" element={<SettingsPage />} />
            </Routes>
        </main>
      </div>
    );
}
