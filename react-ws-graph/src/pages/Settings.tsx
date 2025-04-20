import { useUIStore } from "../store/useUIStore";
import { Switch } from "@/components/ui/Switch";

export const SettingsPage = () => {
  const showFps = useUIStore((s) => s.showFps);
  const toggleFps = useUIStore((s) => s.toggleFps);

  return (
    <div className="w-full px-6 pt-6">
      <h1 className="text-4xl font-bold mb-4">Settings</h1>

      <div className="space-y-4">
        <div className="flex items-center justify-right">
          <span className="text-sm font-medium">Show FPS Counter</span>
          <div className="ml-auto pl-10">
            <Switch checked={showFps} onCheckedChange={toggleFps} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
