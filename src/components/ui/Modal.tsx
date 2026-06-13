"use client";

import React, { useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  size?: "default" | "wide";
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className = "",
  size = "default",
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    const prevFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      prevFocus?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="help-modal-backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className={`help-modal-content ${size === "wide" ? "modal-wide" : ""} ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        <div className="help-modal-header">
          <h2 className="help-modal-title">{title}</h2>
          <button type="button" className="help-modal-close" onClick={onClose} aria-label="Close">
            <FontAwesomeIcon icon={faXmark} /> Close
          </button>
        </div>
        <div className="help-modal-body">{children}</div>
        {footer && <div className="help-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
