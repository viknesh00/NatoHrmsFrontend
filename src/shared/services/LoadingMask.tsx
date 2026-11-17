import React, { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Users } from "lucide-react";

const LoadingMask = ({ loading, layout = false, label = "Loading your workspace" }: Record<string, any>) => {
  const [shape] = useState(() => ["circle", "square", "diamond"][Math.floor(Math.random() * 3)]);
  if (!loading) return null;
  return (
    <div className={`loading-overlay${layout ? " loading-overlay-layout" : ""}`} role="status" aria-live="polite" aria-label={label}>
      <div className="loading-card">
        <div className="loading-brand">
          <Users className="loading-brand-icon" aria-hidden="true" />
          <span>People operations</span>
        </div>
        <div className="loading-animation" aria-hidden="true">
          <div className={`loading-geometry loading-geometry-${shape}`}>
            <span className="loading-geometry-orbit" />
            <span className="loading-geometry-primary" />
            <span className="loading-geometry-secondary" />
            <span className="loading-geometry-core" />
          </div>
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
