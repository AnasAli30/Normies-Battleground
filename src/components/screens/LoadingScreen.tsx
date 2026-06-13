"use client";

import React from "react";

interface LoadingScreenProps {
  progressRef?: React.RefObject<HTMLDivElement | null>;
}

export function LoadingScreen() {
  return (
    <section className="screen active loading-screen">
      <div className="loading-core" />
      <div className="loading-bar-container">
        <div className="loading-bar-fill" id="loading-bar" />
      </div>
      <div className="loading-text" id="loading-text">
        Connecting to Ethereum...
      </div>
    </section>
  );
}
