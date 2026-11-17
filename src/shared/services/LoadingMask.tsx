import React from "react";
import { LoaderCircle } from "lucide-react";
import { Users } from "lucide-react";
import { GameOfLifeLoader } from "../../components/ui/game-of-life-loader";

const LoadingMask = ({ loading, layout = false, label = "Loading your workspace" }: Record<string, any>) => {
  if (!loading) return null;
  return (
    <div className={`loading-overlay${layout ? " loading-overlay-layout" : ""}`} role="status" aria-live="polite" aria-label={label}>
      <div className="loading-card">
        <div className="loading-brand">
          <Users className="loading-brand-icon" aria-hidden="true" />
          <span>People operations</span>
        </div>
        <div className="loading-animation" aria-hidden="true">
          <GameOfLifeLoader
            className="loading-game-of-life"
            cellRadius={2}
            cellSize={12}
            density={0.22}
            fadeDuration={480}
            gap={2}
            maxOpacity={0.34}
            stepInterval={460}
          />
        </div>
        <div className="loading-status-line">
          <LoaderCircle size={14} className="loading-status-icon" aria-hidden="true" />
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingMask;
