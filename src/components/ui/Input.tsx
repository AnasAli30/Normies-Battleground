"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
}

export function Input({ className = "", mono = false, ...props }: InputProps) {
  return (
    <input
      className={`cyber-input ${mono ? "cyber-input-mono" : ""} ${className}`.trim()}
      {...props}
    />
  );
}
