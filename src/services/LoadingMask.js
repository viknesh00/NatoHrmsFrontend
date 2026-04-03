import React from "react";

const LoadingMask = ({ loading }) => {
  if (!loading) return null;
  return (
    <div className="loading-overlay">
      <div className="spinner">
        <div className="spinner-dot"></div>
        <div className="spinner-dot"></div>
        <div className="spinner-dot"></div>
      </div>
    </div>
  );
};

export default LoadingMask;
