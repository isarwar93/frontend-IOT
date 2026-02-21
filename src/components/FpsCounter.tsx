// src/components/FpsCounter.tsx
import React, { useEffect, useRef, useState } from "react";

export const FpsCounter: React.FC = () => {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let animationFrame: number;

    const loop = () => {
      frameCount.current += 1;
      const now = performance.now();
      const delta = now - lastTime.current;

      if (delta >= 1000) {
        setFps(Math.round((frameCount.current * 1000) / delta));
        frameCount.current = 0;
        lastTime.current = now;
      }

      animationFrame = requestAnimationFrame(loop);
    };

    animationFrame = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <div className="fixed bottom-2 right-10 text-xs text-gray-400">
      FPS: <span className="font-mono">{fps}</span>
    </div>
  );
};

export default FpsCounter;
