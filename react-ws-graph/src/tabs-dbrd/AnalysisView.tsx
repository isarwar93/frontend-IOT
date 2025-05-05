import { useLayoutStore } from '../store/layoutStore';
import { Graph } from '../components/Graph';
import { Video } from '../components/Video';
import { AnalysisField } from '../components/AnalysisField';

export const AnalysisView = () => {
  const { config } = useLayoutStore();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Analysis View</h2>
      <div className="grid grid-cols-2 gap-4">
        {[...Array(config.graphs)].map((_, i) => <Graph key={i} index={i} />)}
        {[...Array(config.videos)].map((_, i) => <Video key={i} index={i} />)}
        {[...Array(config.fields)].map((_, i) => <AnalysisField key={i} index={i} />)}
      </div>
    </div>
  );
};
