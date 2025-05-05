import React from "react";
import { useUIStore } from "../store/useUIStore";
import { GraphView } from "../tabs-dbrd/GraphView";
import { VideoView } from "../tabs-dbrd/VideoView";
import { ChatView } from "../tabs-dbrd/ChatView";
import { AnalysisView } from "../tabs-dbrd/AnalysisView";
import { LineChart, Flame, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
    nickname: string;
    username: string;
}

const tabs = [
    { key: "graph", label: "Graph", icon: LineChart },
    { key: "video", label: "Video", icon: Flame },
    { key: "analysis", label: "Analysis", icon: Flame },
    { key: "chat", label: "Chat", icon: MessageSquare },
];

export const DashboardPage: React.FC<Props> = ({ nickname, username }) => {
    const activeTab = useUIStore((s) => s.activeTab);
    const setActiveTab = useUIStore((s) => s.setActiveTab);
    const navigate = useNavigate();

    const handleTabClick = (tab: string) => {
        setActiveTab(tab as any);
        navigate(`/dashboard/${tab}`);
    };

    const renderTab = () => {
        switch (activeTab) {
            case "analysis":
              return <AnalysisView />;
            case "video":
              return <VideoView />;
            case "chat":
              return <ChatView nickname={nickname} user ={username} />;
            default:
              return <GraphView nickname={nickname} user ={username} />;
        }
    };

    return (
        <div className="flex flex-col w-full h-full">
            {/* Header + Tabs */}
            <div className="w-full px-6 pt-6">
              <h1 className="text-4xl font-bold mb-4">Dashboard</h1>

              <div className="border-b border-border w-full">
                <div className="flex w-full">
                  {tabs.map(({ key, label, icon: Icon }) => (
                    <button
                    key={key}
                    onClick={() => handleTabClick(key)}
                    className={`px-4 py-2 text-sm font-medium flex items-center gap-2 capitalize rounded-t-md
                      transition-colors duration-200
                      ${
                        activeTab === key
                          ? "bg-primary text-white"
                          : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
                      }`}
                  >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}

                  {/* Fill remaining space so underline extends */}
                  <div className="flex-1 border-b border-border" />
                </div>
              </div>
            </div>

        {/* Content */}
        <div className="flex-1 p-6 w-full">{renderTab()}</div>
      </div>
    );
};

export default DashboardPage;
