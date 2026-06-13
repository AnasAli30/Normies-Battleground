"use client";

import React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "tertiary" | "opponent";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "cyber-button primary",
  secondary: "cyber-button",
  ghost: "cyber-button ghost",
  tertiary: "cyber-button tertiary",
  opponent: "cyber-button opponent-btn",
};

export function Button({
  variant = "secondary",
  fullWidth = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${variantClass[variant]} touch-target ${fullWidth ? "btn-full-width" : ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
