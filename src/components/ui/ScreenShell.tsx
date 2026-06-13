"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { Button } from "./Button";

interface ScreenShellProps {
  children: React.ReactNode;
  className?: string;
  backLabel?: string;
  onBack?: () => void;
}

export function ScreenShell({ children, className = "", backLabel, onBack }: ScreenShellProps) {
  return (
    <section className={`screen active safe-area-pad ${className}`.trim()}>
      {onBack && (
        <div className="screen-back-bar">
          <Button variant="ghost" onClick={onBack} className="screen-back-btn">
            <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: "8px" }} />
            {backLabel ?? "Back"}
          </Button>
        </div>
      )}
      {children}
    </section>
  );
}
