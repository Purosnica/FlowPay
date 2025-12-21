"use client";

import { cn } from "@/lib/utils";
import { useClickOutside } from "@/hooks/use-click-outside";
import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  side?: "left" | "right" | "top" | "bottom";
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  className?: string;
}

const sideClasses = {
  left: "left-0 top-0 h-full",
  right: "right-0 top-0 h-full",
  top: "top-0 left-0 w-full",
  bottom: "bottom-0 left-0 w-full",
};

const sizeClasses = {
  sm: "w-80",
  md: "w-96",
  lg: "w-[32rem]",
  xl: "w-[42rem]",
  full: "w-full",
};

export function Sheet({
  isOpen,
  onClose,
  title,
  children,
  side = "right",
  size = "md",
  showCloseButton = true,
  className,
}: SheetProps) {
  const sheetRef = useClickOutside<HTMLDivElement>(() => {
    if (isOpen) {
      onClose();
    }
  });

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sheetContent = (
    <div
      className={cn(
        "fixed inset-0 z-[99999] flex",
        side === "left" && "justify-start",
        side === "right" && "justify-end",
        side === "top" && "items-start",
        side === "bottom" && "items-end"
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={sheetRef}
        className={cn(
          "bg-white shadow-2xl dark:bg-gray-dark",
          "flex flex-col",
          "animate-in slide-in-from-left duration-300",
          side === "right" && "slide-in-from-right",
          side === "top" && "slide-in-from-top",
          side === "bottom" && "slide-in-from-bottom",
          sideClasses[side],
          side === "left" || side === "right" ? sizeClasses[size] : "h-96",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between gap-4 border-b border-stroke px-4 py-3 dark:border-dark-3 flex-shrink-0">
            {title && (
              <h3 className="text-lg font-semibold text-dark dark:text-white flex-1 truncate">
                {title}
              </h3>
            )}
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="Cerrar"
                className="h-8 w-8 rounded-full hover:bg-gray-3 dark:hover:bg-dark-3 flex-shrink-0 p-0"
              >
                <svg
                  className="h-4 w-4 text-gray-6 dark:text-dark-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </Button>
            )}
          </div>
        )}

        {/* Body - Scrollable */}
        <div
          className={cn(
            "flex-1 overflow-y-auto custom-scrollbar",
            "px-4 py-4"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );

  if (typeof window !== "undefined") {
    return createPortal(sheetContent, document.body);
  }

  return null;
}

