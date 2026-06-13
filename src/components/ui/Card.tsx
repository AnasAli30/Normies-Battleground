"use client";

import React from "react";

type CardVariant = "default" | "player" | "opponent";

interface CardProps {
  variant?: CardVariant;
  className?: string;
  children: React.ReactNode;
}

export function Card({ variant = "default", className = "", children }: CardProps) {
  const variantClass =
    variant === "player"
      ? "select-panel player flat-card"
      : variant === "opponent"
        ? "select-panel opponent flat-card"
        : "flat-card";

  return <div className={`${variantClass} ${className}`.trim()}>{children}</div>;
}
