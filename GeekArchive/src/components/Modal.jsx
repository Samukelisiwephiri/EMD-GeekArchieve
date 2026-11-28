"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Dialog behaviour shared by every modal: focus starts on `initialFocusRef`, Tab stays
 * inside `panelRef`, Esc calls onClose, page scroll is locked, and focus returns to
 * whatever opened it.
 */
export function useDialog(open, onClose, panelRef, initialFocusRef) {
  const openerRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    openerRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    initialFocusRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, iframe, video, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      if (openerRef.current && typeof openerRef.current.focus === "function") openerRef.current.focus();
    };
  }, [open, onClose, panelRef, initialFocusRef]);
}

/**
 * Accessible dialog: traps focus inside, closes on Esc or backdrop click,
 * locks page scroll, and returns focus to whatever opened it.
 */
export default function Modal({ open, onClose, title, subtitle, size = "lg", children, footer }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  useDialog(open, onClose, panelRef, closeRef);

  if (!open) return null;
  const width = { md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size] || "max-w-2xl";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B1F16]/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[92vh] w-full ${width} flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_30px_80px_rgba(9,25,17,0.35)] sm:rounded-3xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#EEE8E1] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-[#2C1A10]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-[#6E5A4F]">{subtitle}</p>}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#D8CFC4] bg-white text-[#3B2314] hover:bg-[#FAF8F5]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="border-t border-[#EEE8E1] bg-[#FAF8F5] px-5 py-3 sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}
