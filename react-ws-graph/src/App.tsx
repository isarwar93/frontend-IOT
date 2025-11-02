// src/App.tsx
import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/Dashboard';
import { SensorConfigPage } from './pages/SensorConfig';
import { LayoutConfigPage} from './pages/LayoutConfig'; 
import { ProtocolConfigPage }  from './pages/ProtocolConfig'; 
import { SettingsPage } from './pages/Settings';
import TopBar from './components/TopBar';
import LoginPage from './pages/LoginPage';
import GraphConfigPage from './pages/GraphConfig';
import { useRef } from 'react';
import { useUIStore } from './store/useUIStore';

export default function App() {
    const [username, setUsername] = useState('');
    const [nickname, setNickname] = useState('');
    // const [isLoggedIn, setIsLoggedIn] = useState(false);


    // TODO: Implement save scroll position later
    // For now just reset to bottom on route change
    const mainRef = useRef<HTMLDivElement>(null);
    // const location = useLocation();

    // // Scroll to bottom on tab (route) change
    // useEffect(() => {
    //     if (mainRef.current) {
    //         mainRef.current.scrollTop = mainRef.current.scrollHeight;
    //     }
    // }, [location]);
    
    const handleLoginSuccess = (username: string, nickname: string) => {
        setUsername(username);
        setNickname(nickname);
        //setIsLoggedIn(true);
        useUIStore.getState().setIsLoggedIn(true);
    };

    if (!useUIStore((s) => s.isLoggedIn)) {
        return <LoginPage onLoginSuccess={handleLoginSuccess} />;
    }

    return (
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
        <Sidebar />
        <TopBar />
        <main ref={mainRef} className="flex-1 overflow-y-auto p-1">
            <Routes>
                <Route path="/" element={<DashboardPage nickname={nickname} username={username} />} />
                <Route path="/dashboard/*" element={<DashboardPage nickname={nickname} username={username} />} />
                <Route path="/sensor-config" element={<SensorConfigPage />} />
                <Route path="/layout-config" element={<LayoutConfigPage />} />
                <Route path="/protocol-config" element={<ProtocolConfigPage />} />
                <Route path="/graph-config" element={<GraphConfigPage />} />
                <Route path="/settings" element={<SettingsPage />} />
            </Routes>
        </main>
      </div>
    );
}
