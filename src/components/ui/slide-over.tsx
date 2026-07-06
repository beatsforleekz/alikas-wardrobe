"use client";

import type { ReactNode } from "react";

type SlideOverProps = {
  title: string;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  panelClassName?: string;
};

export function SlideOver({
  title,
  subtitle,
  open,
  onClose,
  children,
  footer,
  panelClassName,
}: SlideOverProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="slideover-shell" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="slideover-backdrop"
        aria-label="Close panel"
        onClick={onClose}
      />
      <aside className={`slideover-panel ${panelClassName ?? ""}`.trim()}>
        <div className="slideover-header">
          <div className="slideover-copy">
            <p className="eyebrow">Management</p>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="slideover-close" onClick={onClose} aria-label="Close panel">
            Close
          </button>
        </div>

        <div className="slideover-body">{children}</div>

        {footer ? <div className="slideover-footer">{footer}</div> : null}
      </aside>
    </div>
  );
}
