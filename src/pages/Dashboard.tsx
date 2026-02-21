import React from "react";
import { useUIStore } from "../store/useUIStore";
import { Medical } from "../tabs-dashboard/medical/MedicalView";
import { GraphEngine } from "../tabs-dashboard/GraphEngine";
import { GraphView } from "../tabs-dashboard/GraphView";
import { VideoView } from "../tabs-dashboard/VideoView";
import { ChatView } from "../tabs-dashboard/ChatView";
import { AnalysisView } from "../tabs-dashboard/AnalysisView";
import { LineChart, Flame, MessageSquare, GlassesIcon, BriefcaseMedicalIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
// import { Graph } from "@GraphView";

interface Props {
    nickname: string;
    username: string;
}

const tabs = [
    { key: "medical", label: "Medical", icon: BriefcaseMedicalIcon },
    { key: "graphEngine", label: "GraphEngine", icon: GlassesIcon },
    { key: "video", label: "Video", icon: Flame },
    { key: "analysis", label: "Analysis", icon: Flame },
    { key: "graph", label: "Graph", icon: LineChart },
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
            case "medical":
              return <Medical />;
            case "analysis":
              return <AnalysisView />;
            case "graphEngine":
              return <GraphEngine />;
            case "video":
              return <VideoView />;
            case "chat":
              return <ChatView nickname={nickname} user ={username} />;
            default:
              return <GraphView nickname={nickname} user ={username} />;
        }
    };

    const DashboardTab = ()=> {
      if (useUIStore((s) => !s.topBarExpanded))
        return;
      
    return (
      <div className="p-4 border-b border-border">
        {/* Header + Tabs */}
            <div className="w-full px-6 pt-6">
              <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
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
                  <div className="flex-1 border-c" />
                </div>
              </div>
            </div>

      </div>
    );
    };

    return (

        <div className="flex flex-col w-full h-full">
          <DashboardTab />
           
        {/* Content */}
        <div className="flex-1 p-6 w-full">{renderTab()}</div>
      </div>
    );
};
export default DashboardPage;