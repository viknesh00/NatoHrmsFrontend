import React from "react";
import { LoaderCircle } from "lucide-react";
import FontAwesomeIcon from "../components/ui/font-awesome-icon";
import { GameOfLifeLoader } from "../components/ui/game-of-life-loader";

const LoadingMask = ({ loading }) => {
  if (!loading) return null;
  return (
    <div className="loading-overlay" role="status" aria-live="polite" aria-label="Loading your HRMS workspace">
      <div className="loading-card">
        <div className="loading-brand">
          <FontAwesomeIcon icon="users" className="loading-brand-icon" />
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
          <span>Loading your workspace</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingMask;
