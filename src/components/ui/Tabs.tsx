"use client";

import React from "react";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  hidden?: boolean;
}

interface TabsProps<T extends string> {
  tabs: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}

export function Tabs<T extends string>({ tabs, active, onChange, className = "" }: TabsProps<T>) {
  const visible = tabs.filter((t) => !t.hidden);

  return (
    <div className={`ui-tabs ${className}`.trim()} role="tablist">
      {visible.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={`ui-tab ${active === tab.id ? "active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
