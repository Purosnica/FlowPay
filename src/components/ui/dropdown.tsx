"use client";

import { cn } from "@/lib/utils";
import { useClickOutside } from "@/hooks/use-click-outside";
import { createContext, useContext, useEffect, useCallback, type ReactNode } from "react";

type DropdownContextType = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
};

const DropdownContext = createContext<DropdownContextType | null>(null);

type DropdownProps = {
  children: ReactNode;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
};

type DropdownTriggerProps = {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
  onClick?: () => void;
};

type DropdownContentProps = {
  children: ReactNode;
  className?: string;
  align?: "start" | "end" | "center";
};

export function Dropdown({ children, isOpen, setIsOpen }: DropdownProps) {
  const handleClickOutside = useCallback(() => {
    if (isOpen) {
      setIsOpen(false);
    }
  }, [isOpen, setIsOpen]);

  const dropdownRef = useClickOutside<HTMLDivElement>(handleClickOutside);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
      <div ref={dropdownRef} className="relative">
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownTrigger({
  children,
  className,
  "aria-label": ariaLabel,
  onClick,
  ...props
}: DropdownTriggerProps) {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("DropdownTrigger must be used within Dropdown");
  }

  const { isOpen, setIsOpen } = context;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
    onClick?.();
  };

  return (
    <button
      type="button"
      className={cn(className)}
      aria-label={ariaLabel}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownContent({
  children,
  className,
  align = "end",
}: DropdownContentProps) {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("DropdownContent must be used within Dropdown");
  }

  const { isOpen } = context;

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute z-50 mt-2 rounded-lg",
        align === "start" && "left-0",
        align === "end" && "right-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        className,
      )}
    >
      {children}
    </div>
  );
}

