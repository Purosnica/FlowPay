"use client";

import { cn } from "@/lib/utils";
import { useClickOutside } from "@/hooks/use-click-outside";
import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  footer?: ReactNode;
  closeOnClickOutside?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-5xl",
  full: "max-w-[95vw] mx-4",
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
  footer,
  closeOnClickOutside = true,
  className,
}: ModalProps) {
  const modalRef = useClickOutside<HTMLDivElement>(() => {
    if (isOpen && closeOnClickOutside) {
      onClose();
    }
  });

  useEffect(() => {
    if (!isOpen) return;

    // Prevenir scroll del body sin modificar estilos que puedan mover el header
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Handle ESC key
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

  const modalContent = (
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center",
        "bg-black/60 backdrop-blur-sm",
        "p-4",
        "animate-in fade-in duration-200"
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget && closeOnClickOutside) {
          onClose();
        }
      }}
      onWheel={(e) => {
        // Prevenir scroll en el overlay
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
      onTouchMove={(e) => {
        // Prevenir scroll táctil en el overlay
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
      style={{ 
        zIndex: 99999,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        position: 'fixed',
        overscrollBehavior: 'contain' 
      }}
    >
      <div
        ref={modalRef}
        className={cn(
          "w-full rounded-xl bg-white shadow-2xl dark:bg-gray-dark",
          "flex flex-col",
          "animate-in fade-in-0 zoom-in-95 duration-200",
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "85vh" }}
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
            "px-4 py-4",
            !title && !showCloseButton && "pt-4",
            footer && "pb-3"
          )}
          style={{ 
            minHeight: 0,
            maxHeight: "calc(85vh - 100px)"
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 border-t border-stroke px-6 py-4 dark:border-dark-3 bg-gray-1 dark:bg-dark-2/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // Renderizar el modal usando un portal directamente en el body
  // Esto asegura que esté por encima de todo, incluyendo el header
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  
  return null;
}


