"use client";

import { useState, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ModalCtx = createContext<{ close: () => void }>({ close: () => {} });
export const useModal = () => useContext(ModalCtx);

// Controlled variant — open/close managed by the parent (used for
// row-click editing where one modal serves a whole table).
export function ControlledModal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-md"
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-faint hover:bg-mist hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <ModalCtx.Provider value={{ close: onClose }}>{children}</ModalCtx.Provider>
      </div>
    </div>,
    document.body
  );
}

export function Modal({
  trigger,
  title,
  children,
  wide,
}: {
  trigger: React.ReactNode;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      {open &&
        createPortal(
          // stopPropagation keeps clicks inside the dialog from re-triggering
          // the opener (portal events still bubble through the React tree)
          <div
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <div
              className={cn(
                "relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl",
                wide ? "sm:max-w-2xl" : "sm:max-w-md"
              )}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">{title}</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-ink-faint hover:bg-mist hover:text-ink"
                >
                  <X size={18} />
                </button>
              </div>
              <ModalCtx.Provider value={{ close: () => setOpen(false) }}>
                {children}
              </ModalCtx.Provider>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

// Shared form field primitives
export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-semibold text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputBase =
  "rounded-lg border border-mist bg-white px-3 py-2 text-sm outline-none transition focus:border-elevate-400 focus:shadow-glow";
export const inputCls = `w-full ${inputBase}`;

export function PrimaryBtn({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="w-full rounded-xl bg-elevate-500 px-4 py-2.5 font-semibold text-ink transition hover:bg-elevate-400"
    >
      {children}
    </button>
  );
}
